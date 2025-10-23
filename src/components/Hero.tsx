import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Zap } from "lucide-react";
import { Link } from "react-router-dom";


const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-brain-light via-background to-brain-light">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-radial opacity-30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-radial opacity-20 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-gradient-radial opacity-25 rounded-full animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-gradient-brain text-white px-4 py-2 rounded-full text-sm font-medium mb-6 shadow-glow">
              <Brain className="w-4 h-4" />
              Neural Innovation
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-brain bg-clip-text text-transparent">
                Unlock Your
              </span>{" "}
              <br />
              <span className="text-brain-dark">Mind's Potential</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-lg">
              Revolutionary neuroscience research and brain training technology 
              to enhance cognitive performance and mental wellbeing.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-brain hover:shadow-neural transition-all duration-300 group w-full sm:w-auto">
                  Start Your Journey
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/brain-dump">
                <Button variant="outline" size="lg" className="border-brain-coral text-brain-coral hover:bg-brain-coral hover:text-white transition-all duration-300 w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-8 mt-12 justify-center lg:justify-start">
              <div className="text-center">
                <div className="text-2xl font-bold text-brain-coral">10M+</div>
                <div className="text-sm text-muted-foreground">Neural Connections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-brain-coral">98%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-brain-coral">24/7</div>
                <div className="text-sm text-muted-foreground">Monitoring</div>
              </div>
            </div>
          </div>
          
          {/* Brain Illustration */}
          <div className="relative">
            <div className="relative mx-auto w-fit">
              {/* Floating circles animation */}
              <div className="absolute inset-0 animate-spin [animation-duration:20s]">
                <div className="absolute top-0 left-1/2 w-2 h-2 bg-brain-red rounded-full -translate-x-1/2"></div>
                <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-brain-coral rounded-full -translate-x-1/2"></div>
                <div className="absolute left-0 top-1/2 w-2 h-2 bg-brain-salmon rounded-full -translate-y-1/2"></div>
                <div className="absolute right-0 top-1/2 w-2 h-2 bg-brain-red rounded-full -translate-y-1/2"></div>
              </div>
              
              {/* Pulsing rings */}
              <div className="absolute inset-0 animate-pulse">
                <div className="absolute inset-4 border-2 border-brain-coral/30 rounded-full"></div>
                <div className="absolute inset-8 border-2 border-brain-red/20 rounded-full"></div>
                <div className="absolute inset-12 border-2 border-brain-salmon/25 rounded-full"></div>
              </div>
              
              {/* Main brain image */}
              <img 
                src="/lovable-uploads/773c2be8-b68b-4a80-9b87-2dc83bb1b19c.png" 
                alt="Neural network brain illustration" 
                className="relative z-10 w-96 h-96 object-contain drop-shadow-2xl"
              />
              
              {/* Floating icons */}
              <div className="absolute top-16 -right-8 animate-bounce delay-300">
                <Zap className="w-8 h-8 text-brain-coral" />
              </div>
              <div className="absolute bottom-16 -left-8 animate-bounce delay-700">
                <Brain className="w-8 h-8 text-brain-red" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;