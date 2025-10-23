import { Card, CardContent } from "@/components/ui/card";

const Stats = () => {
  const stats = [
    {
      value: "2.5M+",
      label: "Active Users",
      description: "Minds enhanced worldwide"
    },
    {
      value: "95%",
      label: "Improvement Rate",
      description: "In cognitive performance"
    },
    {
      value: "150+",
      label: "Research Papers",
      description: "Published studies"
    },
    {
      value: "24/7",
      label: "Neural Monitoring",
      description: "Continuous optimization"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-r from-brain-coral/5 via-brain-salmon/5 to-brain-red/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-brain-dark">
            Proven Results
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our neuroscience platform has transformed millions of minds worldwide
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center border-0 bg-white/60 backdrop-blur-sm hover:shadow-glow transition-all duration-300">
              <CardContent className="p-8">
                <div className="text-4xl font-bold bg-gradient-brain bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-lg font-semibold text-brain-dark mb-1">
                  {stat.label}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.description}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;