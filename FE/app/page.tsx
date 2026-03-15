import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Syllabus to Calendar
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Convert your course syllabi into organized week-by-week calendar plans
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/login">
            <Button size="lg" variant="outline">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg">
              <Upload className="w-4 h-4 mr-2" />
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

