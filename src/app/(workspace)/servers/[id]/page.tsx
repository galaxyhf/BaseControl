import { ServerPage } from "@/components/servers/ServerPage";
const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ database?: string }>;
}) => {
  const { id } = await params;
  const { database } = await searchParams;
  return <ServerPage id={id} initialName={database} />;
};
export default Page;
