import Link from 'next/link'
import React from 'react'
import { Github, Twitter, Linkedin } from "lucide-react"
const Footer = () => {
  return (
         <footer className="w-full py-12 bg-background border-t flex flex-col justify-center items-center">
         <div className="container px-4 md:px-6">
           <div className="grid gap-8 md:grid-cols-4">
             <div>
               <h3 className="font-bold mb-4">Bidventor</h3>
               <p className="text-sm text-muted-foreground">Optimizing Amazon PPC campaigns</p>
             </div>
             <div>
               <h4 className="font-bold mb-4">Product</h4>
               <ul className="space-y-2 text-sm">
                 <li>
                   <Link href="#" className="text-muted-foreground hover:text-primary">
                     Features
                   </Link>
                 </li>
                 <li>
                   <Link href="#" className="text-muted-foreground hover:text-primary">
                     Pricing
                   </Link>
                 </li>
                 <li>
                   <Link href="#" className="text-muted-foreground hover:text-primary">
                     FAQ
                   </Link>
                 </li>
               </ul>
             </div>
             <div>
               <h4 className="font-bold mb-4">Company</h4>
               <ul className="space-y-2 text-sm">
                 <li>
                   <Link href="#" className="text-muted-foreground hover:text-primary">
                     About
                   </Link>
                 </li>
                 <li>
                   <Link href="#" className="text-muted-foreground hover:text-primary">
                     Blog
                   </Link>
                 </li>
                 <li>
                   <Link href="#" className="text-muted-foreground hover:text-primary">
                     Contact
                   </Link>
                 </li>
               </ul>
             </div>
             <div>
               <h4 className="font-bold mb-4">Legal</h4>
               <ul className="space-y-2 text-sm">
                 <li>
                   <Link href="#" className="text-muted-foreground hover:text-primary">
                     Privacy
                   </Link>
                 </li>
                 <li>
                   <Link href="#" className="text-muted-foreground hover:text-primary">
                     Terms
                   </Link>
                 </li>
               </ul>
             </div>
           </div>
           <div className="flex flex-col items-center gap-4 mt-8 pt-8 border-t">
             <div className="flex gap-4">
               <Link href="#" className="text-muted-foreground hover:text-primary">
                 <Github className="h-6 w-6" />
               </Link>
               <Link href="#" className="text-muted-foreground hover:text-primary">
                 <Twitter className="h-6 w-6" />
               </Link>
               <Link href="#" className="text-muted-foreground hover:text-primary">
                 <Linkedin className="h-6 w-6" />
               </Link>
             </div>
             <p className="text-sm text-muted-foreground">© 2025 Bidventor. All rights reserved.</p>
           </div>
         </div>
       </footer>
  )
}

export default Footer
