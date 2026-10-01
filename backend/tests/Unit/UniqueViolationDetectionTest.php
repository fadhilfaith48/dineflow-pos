<?php

namespace Tests\Unit;

use App\Http\Controllers\Controller;
use Illuminate\Database\QueryException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/**
 * Regresi isUniqueViolation().
 *
 * Implementasi lama memanggil $e->getConnection() untuk menentukan driver.
 * Illuminate\Database\QueryException TIDAK punya method itu (hanya
 * getConnectionName() dan getConnectionDetails()), sehingga begitu guard ini
 * dipakai di dalam blok catch, PHP melempar:
 *   Error: Call to undefined method ...QueryException::getConnection()
 *
 * Efeknya guard anti-duplikat di OrderController::store() mati total: alih-alih
 * membalas order yang sudah dibuat pesaing, request mengembalikan 500 — tepat
 * pada kondisi balapan yang justru ingin dilindungi.
 *
 * Test ini memakai QueryException buatan (errorInfo diisi manual) supaya ketiga
 * driver tetap teruji walau test suite berjalan di SQLite in-memory.
 */
class UniqueViolationDetectionTest extends TestCase
{
    /**
     * Subclass konkret supaya method protected Controller bisa dipanggil.
     */
    private function detector(): object
    {
        return new class extends Controller
        {
            public function detect(QueryException $e): bool
            {
                return $this->isUniqueViolation($e);
            }
        };
    }

    private function exception(array $errorInfo, string $message = 'SQL error'): QueryException
    {
        $e = new QueryException('mysql', 'insert into orders ...', [], new RuntimeException($message));
        $e->errorInfo = $errorInfo;

        return $e;
    }

    public function test_my_1062_duplicate_entry_terdeteksi(): void
    {
        $e = $this->exception(['23000', 1062, 'Duplicate entry ORD-0008 for key orders.idempotency_key_unique']);

        $this->assertTrue($this->detector()->detect($e));
    }

    public function test_postgres_23505_terdeteksi(): void
    {
        $e = $this->exception(['23505', 7, 'duplicate key value violates unique constraint']);

        $this->assertTrue($this->detector()->detect($e));
    }

    public function test_sqlite_unique_constraint_terdeteksi_lewat_pesan(): void
    {
        // SQLite tidak punya kode error spesifik unique (kode 19 dipakai juga
        // oleh NOT NULL/FK), jadi signature-nya dibaca dari pesan PDO.
        $e = $this->exception(
            ['HY000', 19, 'UNIQUE constraint failed: orders.idempotency_key'],
            'UNIQUE constraint failed: orders.idempotency_key'
        );

        $this->assertTrue($this->detector()->detect($e));
    }

    public function test_pelanggaran_bukan_unique_ditolak(): void
    {
        // 1452 = foreign key constraint violated (SQLSTATE 23000 juga, tapi BUKAN unique)
        $fk = $this->exception(['23000', 1452, 'Cannot add or update a child row']);
        $this->assertFalse($this->detector()->detect($fk));

        // 1048 = column cannot be null
        $notNull = $this->exception(['23000', 1048, "Field 'order_number' cannot be null"]);
        $this->assertFalse($this->detector()->detect($notNull));

        // check constraint MySQL
        $check = $this->exception(['HY000', 3819, 'Check constraint is violated']);
        $this->assertFalse($this->detector()->detect($check));
    }

    public function test_errorInfo_kosong_ditangani_aman(): void
    {
        $e = new QueryException('mysql', 'insert into orders ...', [], new RuntimeException('boom'));

        $this->assertFalse($this->detector()->detect($e));
    }
}
