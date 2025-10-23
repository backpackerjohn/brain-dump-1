import Navbar from "@/components/Navbar";

const SmartReminders = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-brain bg-clip-text text-transparent">
            Smart Reminders
          </h1>
          <p className="text-muted-foreground text-lg">
            Never miss an important thought or task. This page will be built soon.
          </p>
        </div>
      </main>
    </div>
  );
};

export default SmartReminders;
