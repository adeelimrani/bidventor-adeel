import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from 'lucide-react'

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "For small sellers just getting started",
    features: [
      "Optimize up to 3 campaigns",
      "Advanced bid recommendations",
      "Email support"
    ],
    cta: "Free",
    highlighted: false
  },
  {
    name: "Pro",
    price: "$49",
    description: "For growing businesses that need more power",
    features: [
      "Optimize up to 20 campaigns",
      "Advanced recommendations",
      "Priority email support",
    ],
    cta: "Pro",
    highlighted: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large sellers with complex needs",
    features: [
      "Unlimited campaign optimization",
      "24/7 phone & email support",
      "Dedicated account manager"
    ],
    cta: "Contact Sales",
    highlighted: false
  }
]

export function PricingComponent() {
  return (
    <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Pricing Plans</h2>
          <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Choose the perfect plan for your Amazon PPC optimization needs
          </p>
        </div>
        <div className="grid gap-6 mt-12 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.name} className={`flex flex-col justify-between p-6 ${tier.highlighted ? 'border-primary shadow-lg' : ''}`}>
              <div>
                <h3 className="text-2xl font-bold">{tier.name}</h3>
                <div className="mt-4 flex items-baseline text-6xl font-extrabold">
                  {tier.price}
                  {tier.price !== "Custom" && <span className="ml-1 text-2xl font-medium text-muted-foreground">/month</span>}
                </div>
                <p className="mt-5 text-lg text-muted-foreground">{tier.description}</p>
                <ul className="mt-6 space-y-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex">
                      <Check className="flex-shrink-0 w-6 h-6 text-green-500" aria-hidden="true" />
                      <span className="ml-3 text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button className={`mt-8 w-full ${tier.highlighted ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}>
                {tier.cta}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
