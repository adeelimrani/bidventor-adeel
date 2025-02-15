import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import getUsers from "@/actions/getUsers"
import UserList from "./_components/Userlist"

export default async function Dashboard() {
    const {response, error} = await getUsers()

    if(error){
        console.log("Something went wrong")
    }
  return (
    <div className="container mx-auto p-6 space-y-8 h-[90vh]">
      {/* User List Section */}
      <Card>
        <CardHeader>
          <CardTitle>User List ({response?.length} users)</CardTitle>
        </CardHeader>
        <CardContent>
            {response?.map((item, index)=>(
          <div key={index} className="text-sm text-muted-foreground bg-sky-50 p-4 rounded-md">
            {/* user emails  */}
              <UserList users={item}/>
          </div>
            ))}
        </CardContent>
      </Card>

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
              <div className="text-sm text-muted-foreground bg-sky-50 p-4 rounded-md">No blocked emails</div>
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

