import getBlockUser from "@/actions/getBlockUsers"
import getUsers from "@/actions/getUsers"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import UserList from "./_components/Userlist"
import { CheckUser } from "@/lib/checkuser"
import { notFound } from "next/navigation"
export default async function Dashboard() {
    const user = await CheckUser();
    const ROLE = user?.Role

    if(ROLE == 'user'){
      return notFound();
    }
    const {response, error} = await getUsers()

    if(error){
        console.log("Something went wrong")
    }
    const getBlockUsersList = await getBlockUser() 
    if (getBlockUsersList.error){
        console.log("Something went wrong")
    }
  return (
    <div className="container mx-auto p-6 space-y-8 h-[90vh]">
      {/* User List Section */}
      <Card>
        <CardHeader>
          <CardTitle>Users List ({response?.length} users)</CardTitle>
        </CardHeader>
      </Card>
      <Table>
  <TableCaption>A list of Users.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead >Email</TableHead>
      <TableHead>Optimization</TableHead>
      <TableHead>Role</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>

            {response?.length == 0 ? <>
              <TableRow>
              <TableCell className="font-bold">No data available</TableCell>
            <TableCell className="font-bold">No data available</TableCell>
            <TableCell className="font-bold">No data available</TableCell>
            <TableCell className="font-bold text-right">No data available</TableCell>
            </TableRow>
            </>: <>
              {response?.map((item, index)=>(
              <UserList users={item}/>
            ))}
            </>}

            </TableBody>
</Table>
{/* Block Users */}
<Card>
        <CardHeader>
          <CardTitle>Block Users List ({(await getBlockUsersList).response?.length} users)</CardTitle>
        </CardHeader>
      </Card>
      <Table>
  <TableCaption>A list of Block Users.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead >Email</TableHead>
      <TableHead>Optimization</TableHead>
      <TableHead>Role</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
            {(getBlockUsersList).response?.length == 0 ? <>
              <TableRow>
              <TableCell className="font-bold">No data available</TableCell>
            <TableCell className="font-bold">No data available</TableCell>
            <TableCell className="font-bold">No data available</TableCell>
            <TableCell className="font-bold text-right">No data available</TableCell>
            </TableRow>
            </>: <>
              {(getBlockUsersList).response?.map((item, index)=>(
              <UserList users={item}/>
            ))}
            </>}
            
            </TableBody>
</Table>
      {/* Blocked Users & Domains Section */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Blocked Users & Domains</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="blocked-emails">
            <TabsList className="mb-4">
              <TabsTrigger value="blocked-emails">Blocked Emails</TabsTrigger>
              <TabsTrigger value="blocked-domains">Blocked Domains</TabsTrigger>
              <TabsTrigger value="removed-users">Removed Users</TabsTrigger>
              <TabsTrigger value="recorded-emails">Recorded Emails</TabsTrigger>
            </TabsList>
            <TabsContent value="blocked-emails">
              <div className="text-sm text-muted-foreground bg-sky-50 p-4 rounded-md">
                <ul>
                {(await getBlockUsers).response?.map((item, index)=>(
              <li>{item.email}</li>
            ))}
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="blocked-domains">
              <div className="text-sm text-muted-foreground bg-sky-50 p-4 rounded-md">No blocked domains</div>
            </TabsContent>
            <TabsContent value="removed-users">
              <div className="text-sm text-muted-foreground bg-sky-50 p-4 rounded-md">No removed users</div>
            </TabsContent>
            <TabsContent value="recorded-emails">
              <div className="text-sm text-muted-foreground bg-sky-50 p-4 rounded-md">No recorded emails</div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card> */}
    </div>
  )
}

