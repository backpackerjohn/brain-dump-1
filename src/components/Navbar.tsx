import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Brain, Menu, Plus, Map, Bell, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/UserMenu";

const navigationItems = [
  { name: "Brain Dump", href: "/brain-dump", icon: Brain },
  { name: "Maps", href: "/maps", icon: Map },
  { name: "Smart Reminders", href: "/smart-reminders", icon: Bell },
  { name: "Stats", href: "/stats", icon: BarChart3 },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo/Brand */}
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="relative">
            <Brain className="h-8 w-8 text-brain-coral transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-brain-coral/20 blur-xl group-hover:bg-brain-coral/30 transition-all" />
          </div>
          <span className="text-2xl font-bold bg-gradient-brain bg-clip-text text-transparent">
            Momentum
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navigationItems.map((item) => (
            <Link key={item.name} to={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "gap-2 transition-all",
                  isActive(item.href) &&
                    "bg-brain-coral/10 text-brain-coral font-semibold"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          ))}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Brain Dump Plus Button - Hidden on small mobile */}
          <Link to="/brain-dump" className="hidden sm:block">
            <Button variant="brain" size="default" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">Brain Dump Plus</span>
              <span className="lg:hidden">New</span>
            </Button>
          </Link>

          {/* User Profile */}
          <UserMenu />

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-4 mt-8">
                <Link to="/" className="flex items-center space-x-2 mb-4">
                  <Brain className="h-6 w-6 text-brain-coral" />
                  <span className="text-xl font-bold bg-gradient-brain bg-clip-text text-transparent">
                    Momentum
                  </span>
                </Link>

                {/* Mobile Brain Dump Plus */}
                <Link to="/brain-dump" onClick={() => setIsOpen(false)}>
                  <Button variant="brain" className="w-full gap-2 justify-start">
                    <Plus className="h-4 w-4" />
                    Brain Dump Plus
                  </Button>
                </Link>

                <div className="border-t pt-4">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-3 mb-1",
                          isActive(item.href) &&
                            "bg-brain-coral/10 text-brain-coral font-semibold"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
