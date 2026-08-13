import { TopNavBar } from '@/components/TopNavBar'

interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex h-screen flex-col">
      <TopNavBar />
      <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-bg-secondary p-6">
        <h1 className="text-heading font-semibold text-text-primary">{title}</h1>
        <p className="max-w-md text-center text-body text-text-secondary">{description}</p>
      </main>
    </div>
  )
}
