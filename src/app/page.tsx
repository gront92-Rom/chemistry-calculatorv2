/*
Design Philosophy: Retro-Futurism with 1980s Scientific Computing Aesthetic
- CRT monitor-inspired displays with scan-line effects and phosphor glow
- Grid-based layouts reminiscent of early computer interfaces and oscilloscopes
- Electric cyan (#00ffff) primary, neon orange (#ff6b35) accent, terminal green (#00ff41) success
- Monospace fonts with slight letter-spacing for digital display aesthetic
*/

'use client';

import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { Calculator, Droplet } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MassCalculator from "@/components/MassCalculator";
import DilutionCalculator from "@/components/DilutionCalculator";
import LabTimer from "@/components/LabTimer";
import QuickReference from "@/components/QuickReference";
import CalculationHistory from "@/components/CalculationHistory";

export default function Home() {
  const { history, clearHistory, deleteEntry } = useCalculationHistory();
  
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background grid pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Hero background image */}
      <div 
        className="absolute top-0 left-0 right-0 h-64 opacity-30"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1920&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Scan-line overlay */}
      <div className="scanlines absolute inset-0 pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b-2 border-primary bg-card/80 backdrop-blur-sm">
          <div className="container py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Calculator className="w-12 h-12 text-primary neon-glow" />
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold text-primary neon-glow">
                    CHEMLAB PRO
                  </h1>
                  <p className="text-sm text-muted-foreground tracking-widest">
                    CALCULATOR & TIMER FOR LABORATORY
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Link href="/osmolarity">
                  <button className="flex items-center gap-2 px-4 py-2 border-2 border-accent bg-accent/20 hover:bg-accent/30 transition-colors text-xs font-bold tracking-wider text-accent"
                    style={{ boxShadow: "0 0 5px var(--color-neon-orange)" }}>
                    <Droplet className="w-4 h-4" />
                    OSMOLARITY CALC
                  </button>
                </Link>
                <div className="flex items-center gap-2 px-3 py-2 border border-primary/50 bg-card/50 rounded text-xs">
                  <div className="w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
                  <span className="text-primary">SYSTEM ONLINE</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container py-8">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Calculator Panel */}
            <div className="border-2 border-primary bg-card/80 backdrop-blur-sm neon-border p-6 scanlines">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 bg-primary rounded-full neon-glow" />
                <h2 className="text-xl font-bold text-primary tracking-wider">
                  CHEMISTRY CALCULATOR
                </h2>
              </div>
              
              <Tabs defaultValue="mass" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-secondary/50 border border-primary/30 p-1">
                  <TabsTrigger 
                    value="mass"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:neon-glow font-bold text-xs tracking-wider"
                  >
                    MASS CALC
                  </TabsTrigger>
                  <TabsTrigger 
                    value="dilution"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:neon-glow font-bold text-xs tracking-wider"
                  >
                    DILUTION CALC
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="mass" className="mt-6">
                  <MassCalculator />
                </TabsContent>
                
                <TabsContent value="dilution" className="mt-6">
                  <DilutionCalculator />
                </TabsContent>
              </Tabs>
            </div>

            {/* Timer Panel */}
            <div className="border-2 border-accent bg-card/80 backdrop-blur-sm p-6 scanlines"
              style={{
                boxShadow: `
                  0 0 5px var(--color-neon-orange),
                  0 0 10px var(--color-neon-orange),
                  inset 0 0 5px var(--color-neon-orange)
                `
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 bg-accent rounded-full animate-pulse"
                  style={{
                    boxShadow: '0 0 10px var(--color-neon-orange)'
                  }}
                />
                <h2 className="text-xl font-bold text-accent tracking-wider"
                  style={{
                    textShadow: `
                      0 0 5px var(--color-neon-orange),
                      0 0 10px var(--color-neon-orange)
                    `
                  }}
                >
                  LABORATORY TIMER
                </h2>
              </div>
              
              <LabTimer />
            </div>
          </div>

          {/* Calculation History */}
          <div className="mt-6">
            <div className="border-2 border-primary bg-card/80 backdrop-blur-sm p-6 scanlines">
              <CalculationHistory 
                history={history} 
                onClear={clearHistory} 
                onDelete={deleteEntry} 
              />
            </div>
          </div>

          {/* Quick Reference */}
          <div className="mt-6">
            <QuickReference />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t-2 border-primary bg-card/80 backdrop-blur-sm mt-12">
          <div className="container py-4">
            <p className="text-center text-xs text-muted-foreground tracking-widest">
              CHEMLAB PRO v2.3 | RETRO-FUTURISTIC COMPUTING SYSTEM | Background Timer Support
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
