import { Card, Button } from '../components'

const NetListPage = () => {
  return (
    <div className="min-h-screen page-gradient pb-20 pt-4">
      <div className="px-4">
        <Card className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Net-Лист</h2>
          <p className="text-gray-600 mb-6 text-base">
            У вас пока нет контактов.<br />
            Начните знакомиться!
          </p>
          <Button variant="primary" size="lg" fullWidth>
            Найти новых знакомых
          </Button>
        </Card>
      </div>
    </div>
  )
}

export default NetListPage

