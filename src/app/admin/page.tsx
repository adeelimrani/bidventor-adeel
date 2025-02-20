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
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { AddUserDialog } from "./_components/AddUserDialog"
import getAllUsers from "@/actions/getAllUsers"
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
      <div className="text-right">
      <AddUserDialog/>

      </div>
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
              <UserList key={index} users={item}/>
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
              <UserList key={index} users={item}/>
            ))}
            </>}
            
            </TableBody>
</Table>
      
    </div>
  )
}

