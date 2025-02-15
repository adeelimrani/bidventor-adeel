import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
  <>
  <div className='m-auto  px-4 sm:px-6 lg:px-8 bg-pattern min-h-screen flex items-center justify-center'>
  <SignIn />
  </div>
  
  </>
  )
}