"use client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Upload, Star, Github, Twitter, Linkedin, CheckCircle, Loader } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useActionState, useState } from "react"
import { PricingComponent } from "@/components/Pricing"
import { toast } from "sonner";
import { useFormState, useFormStatus } from 'react-dom'
import { processAmazonAdsUpload } from "@/actions/generateReports"
export default function LandingPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadUrlPdf, setDownloadUrlPdf] = useState("");
  const [success, setSuccess] = useState(false);
  const [file, setfile] = useState(false);
  const handleSubmit = async (e:any) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    setfile(true);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://babend-adeel.replit.app/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log(data);
      
      if (data) {
        setFiles(data.files);
        setDownloadUrl(data.files['Amazon_Upload.xlsx']);
        setDownloadUrlPdf(data.files['Impact_Report.pdf']);
        toast.success('File uploaded successfully');
      }
    } catch (err) {
      //@ts-ignore
      toast.error(err.message);
      console.log(err);
      
      //@ts-ignore
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col justify-center items-center mx-auto min-h-screen md:lg:w-max">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6">
  <div className="container px-4 md:px-6 mx-auto">
    <div className="flex flex-col items-center space-y-8 text-center">
      <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
        Optimize Your Amazon Bids
      </h1>
      <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
        Effortlessly optimize your Amazon PPC bids using our advanced Algorithm. Upload your campaign data and get
        instant optimization suggestions.
      </p>

      <div className="w-full max-w-md mx-auto">
      <form
        className="flex flex-col items-center gap-4 border border-gray-300 rounded-lg p-6 shadow-md bg-white"
        onSubmit={handleSubmit}
      >
        {/* File Upload Box */}
        <label
          className={`w-full cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            error ? 'border-red-500' : 'border-gray-300 hover:border-primary'
          }`}
        >
          <input
            type="file"
            name="file"
            id="file"
            accept=".xlsx"
            required={true}
            className="hidden" //@ts-ignore
            onChange={(e) => {//@ts-ignore
              setSelectedFile(e.target.files[0]);
              if (e.target.files && e.target.files.length > 0) {
                //@ts-ignore
              setfile(e.target.files[0].name);
              } else {
                //@ts-ignore
              setfile(null);
              }
        setSuccess(true);
setTimeout(() => {
  setSuccess(false);
  
}, 2000);
            }}
            disabled={loading}
            />
          <div className="flex flex-col items-center space-y-2">
            {loading ? (
              <Loader className="h-8 w-8 text-gray-500 animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-gray-500" />
            )}
            {file ? (
              <p className="text-sm text-gray-600 uppercase font-semibold">{file}</p>
            ):(<>
              <p className="text-sm text-gray-600">Drag and drop your file here</p>
              <p className="text-xs text-gray-400">Supported format: Excel (.xlsx), max 300MB</p>
              </>
            )
          }
          </div>
        </label>

        {/* Error Message */}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Success Message */}
        {success && (
          <p className="text-sm text-green-500 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> File uploaded successfully!
          </p>
        )}

        {/* Upload Button */}
        <Button size="default" type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Processe File'}
        </Button>

        <p className="text-sm text-muted-foreground">
          Upload your first 3 campaigns for free
        </p>
      </form>

      {/* Download Link */}
      {downloadUrl && (
        <div className="mt-4 text-center">
          <a
            href={downloadUrl}
            download="Optimization_Log.xlsx"
            className="text-primary hover:underline"
          >
            Download Optimized File
          </a>
        </div>
      )}
      {downloadUrlPdf && (
        <div className="mt-4 text-center">
          <a
            href={downloadUrlPdf}
            download="Optimization_Report.pdf"
            className="text-primary hover:underline"
          >
            Download Optimization PDF Report
          </a>
        </div>
      )}
    </div>
    </div>
  </div>
</div>
</section>


      {/* Trust Badge */}
      <section className="w-full py-6 bg-muted/30">
        <div className="container px-4 md:px-6 text-center">
          <p className="text-muted-foreground rounded-md">Trusted by thousands of Amazon sellers worldwide</p>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="w-full py-12 md:py-24">
        <div className="container px-4 md:px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose Bidventor for Your Amazon PPC Optimization?
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <div className="absolute -left-4 -top-4 size-12 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                01.
              </div>
              <Card className="p-6 pt-8">
                <h3 className="font-bold mb-2">Smart Automation</h3>
                <p className="text-muted-foreground">
                  Say goodbye to manual bid adjustments and embrace the power of AI optimization.
                </p>
              </Card>
            </div>
            <div className="relative">
              <div className="absolute -left-4 -top-4 size-12 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                02.
              </div>
              <Card className="p-6 pt-8">
                <h3 className="font-bold mb-2">Data-Driven Insights</h3>
                <p className="text-muted-foreground">
                  Make decisions based on comprehensive analysis of your campaign performance.
                </p>
              </Card>
            </div>
            <div className="relative">
              <div className="absolute -left-4 -top-4 size-12 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                03.
              </div>
              <Card className="p-6 pt-8">
                <h3 className="font-bold mb-2">Easy Integration</h3>
                <p className="text-muted-foreground">Seamlessly works with your Amazon Seller Central campaign data.</p>
              </Card>
            </div>
            <div className="relative">
              <div className="absolute -left-4 -top-4 size-12 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                04.
              </div>
              <Card className="p-6 pt-8">
                <h3 className="font-bold mb-2">Secure Platform</h3>
                <p className="text-muted-foreground">
                  Your data is encrypted and protected with enterprise-grade security.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing/Accessibility Section */}
      {/* <section className="w-full py-12 md:py-24 bg-muted/50">
        <div className="container px-4 md:px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Accessibility</h2>
          <p className="text-center text-muted-foreground mb-12">
            Choose the plan that best fits your optimization needs
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="p-6 bg-background/60 backdrop-blur">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">Anonymous</h3>
                <p className="text-sm text-muted-foreground">No Sign up Needed</p>
                <p className="text-sm text-muted-foreground">Optimize 5 Campaigns for Free</p>
              </div>
              <div className="flex justify-center mb-6">
                <Image
                  src="/placeholder.svg"
                  alt="Anonymous user icon"
                  width={100}
                  height={100}
                  className="rounded-full"
                />
              </div>
              <Button className="w-full">Try for Free</Button>
            </Card>
            <Card className="p-6 bg-background/60 backdrop-blur">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">Basic</h3>
                <p className="text-sm text-muted-foreground">Signup is free</p>
                <p className="text-sm text-muted-foreground">Optimize 20 campaigns/month</p>
              </div>
              <div className="flex justify-center mb-6">
                <Image src="/placeholder.svg" alt="Signup badge" width={100} height={100} className="rounded-full" />
              </div>
              <Button className="w-full">Sign Up Free</Button>
            </Card>
            <Card className="p-6 bg-background/60 backdrop-blur">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">Premium</h3>
                <p className="text-sm text-muted-foreground">Unlimited Optimization</p>
                <p className="text-sm text-muted-foreground">Advanced Features</p>
              </div>
              <div className="flex justify-center mb-6">
                <Image src="/placeholder.svg" alt="Premium badge" width={100} height={100} className="rounded-full" />
              </div>
              <Button className="w-full">Get Premium</Button>
            </Card>
          </div>
        </div>
      </section> */}
      

      {/* Pricing Component */}
      <PricingComponent />

      {/* Testimonials Section */}
      <section className="w-full py-12 md:py-24">
        <div className="container px-4 md:px-6">
          <h2 className="text-3xl font-bold text-center mb-12">What our users say</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Image src="/placeholder.svg" alt="User avatar" width={48} height={48} className="rounded-full" />
                <div>
                  <p className="font-bold">Sarah K.</p>
                  <div className="flex text-primary">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground">
                "Bidventor has transformed our Amazon PPC strategy. The AI-powered optimization saved us countless hours
                and improved our ROAS significantly."
              </p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Image src="/placeholder.svg" alt="User avatar" width={48} height={48} className="rounded-full" />
                <div>
                  <p className="font-bold">Michael R.</p>
                  <div className="flex text-primary">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground">
                "The ease of use and accuracy of bid recommendations is impressive. Our campaigns are performing better
                than ever."
              </p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Image src="/placeholder.svg" alt="User avatar" width={48} height={48} className="rounded-full" />
                <div>
                  <p className="font-bold">Lisa M.</p>
                  <div className="flex text-primary">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground">
                "Finally, a tool that makes PPC optimization straightforward and effective. The ROI speaks for itself."
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Expanded FAQ Section */}
      <section className="w-full py-12 md:py-24 bg-muted/50">
        <div className="container px-4 md:px-6">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full max-w-2xl mx-auto">
            <AccordionItem value="item-1">
              <AccordionTrigger>How does Bidventor work?</AccordionTrigger>
              <AccordionContent>
                Simply upload your Amazon campaign data, and our Advanced Algorithm will analyze your performance metrics to suggest
                optimal bid adjustments for each keyword.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>What format should my data be in?</AccordionTrigger>
              <AccordionContent>
                We accept Excel exports from Amazon Seller Central. You can download your campaign reports and upload them
                directly.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Is there a free trial?</AccordionTrigger>
              <AccordionContent>
                Yes! You can optimize up to 3 campaigns for free without signing up. For unlimited optimizations, check
                out our premium plans.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>Can I export the optimized data?</AccordionTrigger>
              <AccordionContent>
                Yes, you can export your optimized campaign data in CSV format, ready to be uploaded back to Amazon
                Seller Central.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

 
    </div>
  )
}