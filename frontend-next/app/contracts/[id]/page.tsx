import { ContractDetailsPage } from '@/components/ContractDetailsPage'

type ContractRouteParams = {
  id: string
}

export default async function Page({ params }: { params: Promise<ContractRouteParams> }) {
  const { id } = await params
  return <ContractDetailsPage id={id} />
}
