import { Card, CardContent } from "@/components/ui/card";
import { Brain, Lightbulb, Target, TrendingUp } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "Cognitive Enhancement",
      description: "Advanced algorithms designed to optimize your brain's natural learning pathways and improve memory retention."
    },
    {
      icon: Lightbulb,
      title: "Neural Insights",
      description: "Deep analysis of your cognitive patterns with personalized recommendations for mental performance improvement."
    },
    {
      icon: Target,
      title: "Precision Training",
      description: "Targeted exercises that adapt to your unique neural profile for maximum effectiveness and engagement."
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Real-time monitoring of your cognitive improvements with detailed analytics and milestone achievements."
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-background to-brain-light/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-brain bg-clip-text text-transparent">
              Breakthrough Features
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Cutting-edge neuroscience technology designed to unlock your brain's full potential
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-neural transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm hover:-translate-y-2"
            >
              <CardContent className="p-6 text-center">
                <div className="mb-4 mx-auto w-16 h-16 bg-gradient-brain rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-brain-dark">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;