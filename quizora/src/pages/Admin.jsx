
import Card from '../components/Card'

export default function Admin() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <h2 className="mb-2 text-xl font-semibold">Admin Panel</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Create, schedule, and manage quizzes.</p>
      </Card>
      <Card>
        <h2 className="mb-2 text-xl font-semibold">User Management</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Approve roles and moderate content.</p>
      </Card>
    </div>
  )
}
