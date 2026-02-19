'use client';

/*
Design Philosophy: Retro-Futurism with 1980s Scientific Computing Aesthetic
Dilution Calculator - C₁×V₁ = C₂×V₂ formula with serial dilution support
Now supports different units for initial and final concentrations/volumes
*/

import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ConcentrationUnit = "mol/L" | "mmol/L" | "mg/mL" | "µg/mL" | "g/L";
type VolumeUnit = "L" | "mL" | "µL";
type SolveFor = "C1" | "V1" | "C2" | "V2";

// Unit conversion factors (to base unit)
const concentrationToBase: Record<ConcentrationUnit, number> = {
  "mol/L": 1,
  "mmol/L": 0.001,
  "g/L": 1, // g/L is same as mg/mL
  "mg/mL": 1, // 1 mg/mL = 1 g/L
  "µg/mL": 0.001, // 1 µg/mL = 1 mg/L
};

const volumeToBase: Record<VolumeUnit, number> = {
  "L": 1,
  "mL": 0.001,
  "µL": 0.000001,
};

export default function DilutionCalculator() {
  const { addEntry } = useCalculationHistory();
  
  // Single dilution state - now with separate units for each parameter
  const [solveFor, setSolveFor] = useState<SolveFor>("V1");
  const [c1, setC1] = useState<string>("5.0");
  const [c1Unit, setC1Unit] = useState<ConcentrationUnit>("mg/mL");
  const [v1, setV1] = useState<string>("");
  const [v1Unit, setV1Unit] = useState<VolumeUnit>("mL");
  const [c2, setC2] = useState<string>("0.5");
  const [c2Unit, setC2Unit] = useState<ConcentrationUnit>("mg/mL");
  const [v2, setV2] = useState<string>("100");
  const [v2Unit, setV2Unit] = useState<VolumeUnit>("mL");
  const [result, setResult] = useState<number | null>(null);
  const [resultUnit, setResultUnit] = useState<string>("");

  // Serial dilution state
  const [startConc, setStartConc] = useState<string>("100");
  const [finalConc, setFinalConc] = useState<string>("1");
  const [numSteps, setNumSteps] = useState<string>("5");
  const [serialConcUnit, setSerialConcUnit] = useState<ConcentrationUnit>("mg/mL");
  const [serialSeries, setSerialSeries] = useState<{ step: number; concentration: number }[]>([]);
  const [dilutionFactor, setDilutionFactor] = useState<number | null>(null);

  // Convert concentration to base unit (g/L equivalent)
  const convertConcToBase = (value: number, unit: ConcentrationUnit): number => {
    return value * concentrationToBase[unit];
  };

  // Convert from base unit to target unit
  const convertConcFromBase = (value: number, unit: ConcentrationUnit): number => {
    return value / concentrationToBase[unit];
  };

  // Convert volume to base unit (L)
  const convertVolToBase = (value: number, unit: VolumeUnit): number => {
    return value * volumeToBase[unit];
  };

  // Convert from base unit to target unit
  const convertVolFromBase = (value: number, unit: VolumeUnit): number => {
    return value / volumeToBase[unit];
  };

  const calculateSingleDilution = () => {
    const c1Val = parseFloat(c1);
    const v1Val = parseFloat(v1);
    const c2Val = parseFloat(c2);
    const v2Val = parseFloat(v2);

    if (isNaN(c1Val) || isNaN(v1Val) || isNaN(c2Val) || isNaN(v2Val)) {
      return;
    }

    // Convert all to base units for calculation
    const c1Base = convertConcToBase(c1Val, c1Unit);
    const v1Base = convertVolToBase(v1Val, v1Unit);
    const c2Base = convertConcToBase(c2Val, c2Unit);
    const v2Base = convertVolToBase(v2Val, v2Unit);

    let resultValue: number;
    let resultLabel: string;
    let displayUnit: string;

    switch (solveFor) {
      case "C1":
        // C1 = (C2 × V2) / V1
        resultValue = (c2Base * v2Base) / v1Base;
        // Convert to C1's unit
        resultValue = convertConcFromBase(resultValue, c1Unit);
        displayUnit = c1Unit;
        resultLabel = `C₁ = ${resultValue.toFixed(4)} ${displayUnit}`;
        break;
      case "V1":
        // V1 = (C2 × V2) / C1
        resultValue = (c2Base * v2Base) / c1Base;
        // Convert to V1's unit
        resultValue = convertVolFromBase(resultValue, v1Unit);
        displayUnit = v1Unit;
        resultLabel = `V₁ = ${resultValue.toFixed(4)} ${displayUnit}`;
        break;
      case "C2":
        // C2 = (C1 × V1) / V2
        resultValue = (c1Base * v1Base) / v2Base;
        // Convert to C2's unit
        resultValue = convertConcFromBase(resultValue, c2Unit);
        displayUnit = c2Unit;
        resultLabel = `C₂ = ${resultValue.toFixed(4)} ${displayUnit}`;
        break;
      case "V2":
        // V2 = (C1 × V1) / C2
        resultValue = (c1Base * v1Base) / c2Base;
        // Convert to V2's unit
        resultValue = convertVolFromBase(resultValue, v2Unit);
        displayUnit = v2Unit;
        resultLabel = `V₂ = ${resultValue.toFixed(4)} ${displayUnit}`;
        break;
    }

    setResult(resultValue);
    setResultUnit(displayUnit);
    
    // Add to history
    addEntry({
      type: "dilution",
      inputs: { 
        C1: `${c1Val} ${c1Unit}`, 
        V1: `${v1Val} ${v1Unit}`, 
        C2: `${c2Val} ${c2Unit}`, 
        V2: `${v2Val} ${v2Unit}`, 
        solveFor 
      },
      result: resultLabel
    });
  };

  const calculateSerialDilution = () => {
    const start = parseFloat(startConc);
    const final = parseFloat(finalConc);
    const steps = parseInt(numSteps);

    if (start <= 0 || final <= 0 || steps < 2 || final >= start) {
      return;
    }

    // Calculate dilution factor: factor = (C_start / C_final)^(1/(steps-1))
    const factor = Math.pow(start / final, 1 / (steps - 1));
    setDilutionFactor(factor);

    // Generate series
    const series: { step: number; concentration: number }[] = [];
    for (let i = 0; i < steps; i++) {
      const concentration = start / Math.pow(factor, i);
      series.push({ step: i + 1, concentration });
    }

    setSerialSeries(series);

    // Add to history
    addEntry({
      type: "serial_dilution",
      inputs: { startConc: start, finalConc: final, steps, unit: serialConcUnit },
      result: `${steps} steps, dilution factor: ${factor.toFixed(3)}`
    });
  };

  return (
    <Tabs defaultValue="single" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-card/50">
        <TabsTrigger 
          value="single"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:neon-glow font-bold text-xs tracking-wider"
        >
          SINGLE DILUTION
        </TabsTrigger>
        <TabsTrigger 
          value="serial"
          className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground font-bold text-xs tracking-wider"
        >
          SERIAL DILUTION
        </TabsTrigger>
      </TabsList>

      <TabsContent value="single" className="mt-6">
        {/* Formula Display */}
        <div className="mb-6 p-4 bg-primary/10 border border-primary rounded text-center">
          <p className="text-primary font-mono text-lg tracking-wider neon-glow">
            C₁ × V₁ = C₂ × V₂
          </p>
        </div>

        {/* Solve For Selection */}
        <div className="mb-6 p-3 bg-card/30 border border-accent/30 rounded">
          <Label className="text-accent text-xs tracking-wider mb-2 block">CALCULATE</Label>
          <div className="grid grid-cols-4 gap-2">
            {(['C1', 'V1', 'C2', 'V2'] as SolveFor[]).map((option) => (
              <Button
                key={option}
                variant={solveFor === option ? "default" : "outline"}
                onClick={() => setSolveFor(option)}
                className={solveFor === option ? "neon-glow bg-accent hover:bg-accent/90" : ""}
                style={solveFor === option ? {
                  boxShadow: `
                    0 0 5px var(--color-neon-orange),
                    0 0 10px var(--color-neon-orange)
                  `
                } : {}}
              >
                {option === 'C1' ? 'C₁' : option === 'C2' ? 'C₂' : option === 'V1' ? 'V₁' : 'V₂'}
              </Button>
            ))}
          </div>
        </div>

        {/* Initial Solution (C₁, V₁) */}
        <div className="mb-4">
          <Label className="text-primary text-xs tracking-wider mb-2 block">● INITIAL SOLUTION (C₁, V₁)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                type="number"
                placeholder="C₁"
                value={c1}
                onChange={(e) => setC1(e.target.value)}
                disabled={solveFor === "C1"}
                className="bg-background/50 border-primary/50 text-primary font-mono disabled:opacity-50"
              />
            </div>
            <div>
              <Select 
                value={c1Unit} 
                onValueChange={(v) => setC1Unit(v as ConcentrationUnit)}
                disabled={solveFor === "C1"}
              >
                <SelectTrigger className="bg-background/50 border-primary/50 text-primary font-mono disabled:opacity-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mol/L">mol/L</SelectItem>
                  <SelectItem value="mmol/L">mmol/L</SelectItem>
                  <SelectItem value="g/L">g/L</SelectItem>
                  <SelectItem value="mg/mL">mg/mL</SelectItem>
                  <SelectItem value="µg/mL">µg/mL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="number"
                placeholder="V₁"
                value={v1}
                onChange={(e) => setV1(e.target.value)}
                disabled={solveFor === "V1"}
                className="bg-background/50 border-primary/50 text-primary font-mono disabled:opacity-50"
              />
            </div>
            <div>
              <Select 
                value={v1Unit} 
                onValueChange={(v) => setV1Unit(v as VolumeUnit)}
                disabled={solveFor === "V1"}
              >
                <SelectTrigger className="bg-background/50 border-primary/50 text-primary font-mono disabled:opacity-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="mL">mL</SelectItem>
                  <SelectItem value="µL">µL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Final Solution (C₂, V₂) */}
        <div className="mb-6">
          <Label className="text-primary text-xs tracking-wider mb-2 block">● FINAL SOLUTION (C₂, V₂)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                type="number"
                placeholder="C₂"
                value={c2}
                onChange={(e) => setC2(e.target.value)}
                disabled={solveFor === "C2"}
                className="bg-background/50 border-primary/50 text-primary font-mono disabled:opacity-50"
              />
            </div>
            <div>
              <Select 
                value={c2Unit} 
                onValueChange={(v) => setC2Unit(v as ConcentrationUnit)}
                disabled={solveFor === "C2"}
              >
                <SelectTrigger className="bg-background/50 border-primary/50 text-primary font-mono disabled:opacity-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mol/L">mol/L</SelectItem>
                  <SelectItem value="mmol/L">mmol/L</SelectItem>
                  <SelectItem value="g/L">g/L</SelectItem>
                  <SelectItem value="mg/mL">mg/mL</SelectItem>
                  <SelectItem value="µg/mL">µg/mL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="number"
                placeholder="V₂"
                value={v2}
                onChange={(e) => setV2(e.target.value)}
                disabled={solveFor === "V2"}
                className="bg-background/50 border-primary/50 text-primary font-mono disabled:opacity-50"
              />
            </div>
            <div>
              <Select 
                value={v2Unit} 
                onValueChange={(v) => setV2Unit(v as VolumeUnit)}
                disabled={solveFor === "V2"}
              >
                <SelectTrigger className="bg-background/50 border-primary/50 text-primary font-mono disabled:opacity-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="mL">mL</SelectItem>
                  <SelectItem value="µL">µL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Calculate Button */}
        <Button 
          onClick={calculateSingleDilution}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wider neon-glow"
          style={{
            boxShadow: `
              0 0 10px var(--color-cyan),
              0 0 20px var(--color-cyan),
              inset 0 0 10px var(--color-cyan)
            `
          }}
        >
          CALCULATE {solveFor === 'C1' ? 'C₁' : solveFor === 'C2' ? 'C₂' : solveFor === 'V1' ? 'V₁' : 'V₂'}
        </Button>

        {/* Result Display */}
        {result !== null && (
          <div className="mt-6 p-6 bg-card border-2 border-terminal-green rounded"
            style={{
              boxShadow: `
                0 0 10px var(--color-terminal-green),
                inset 0 0 10px var(--color-terminal-green)
              `
            }}
          >
            <p className="text-xs text-terminal-green/70 tracking-wider mb-2">
              {solveFor === 'C1' ? 'C₁ RESULT' : solveFor === 'C2' ? 'C₂ RESULT' : solveFor === 'V1' ? 'V₁ RESULT' : 'V₂ RESULT'}
            </p>
            <p className="text-4xl font-bold text-terminal-green font-mono tracking-wider"
              style={{
                textShadow: `
                  0 0 10px var(--color-terminal-green),
                  0 0 20px var(--color-terminal-green)
                `
              }}
            >
              {result.toFixed(4)}
            </p>
            <p className="text-terminal-green font-mono mt-2 text-lg">
              {resultUnit}
            </p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="serial" className="mt-6">
        {/* Serial Dilution Description */}
        <div className="mb-6 p-4 bg-card/30 border border-accent/30 rounded">
          <p className="text-xs text-accent/70 tracking-wide">
            SERIAL DILUTION
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Calculate a series of dilutions from starting to final concentration.
            The dilution factor is automatically computed.
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-4 mb-6">
          <div>
            <Label className="text-accent text-xs tracking-wider mb-2 block">STARTING CONCENTRATION</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="100"
                value={startConc}
                onChange={(e) => setStartConc(e.target.value)}
                className="bg-background/50 border-accent/50 text-accent font-mono"
              />
              <Select value={serialConcUnit} onValueChange={(v) => setSerialConcUnit(v as ConcentrationUnit)}>
                <SelectTrigger className="bg-background/50 border-accent/50 text-accent font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mol/L">mol/L</SelectItem>
                  <SelectItem value="mmol/L">mmol/L</SelectItem>
                  <SelectItem value="g/L">g/L</SelectItem>
                  <SelectItem value="mg/mL">mg/mL</SelectItem>
                  <SelectItem value="µg/mL">µg/mL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-accent text-xs tracking-wider mb-2 block">FINAL CONCENTRATION</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="1"
                value={finalConc}
                onChange={(e) => setFinalConc(e.target.value)}
                className="bg-background/50 border-accent/50 text-accent font-mono"
              />
              <div className="text-accent font-mono flex items-center pl-3 bg-background/50 border border-accent/50 rounded">
                {serialConcUnit}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-accent text-xs tracking-wider mb-2 block">NUMBER OF STEPS</Label>
            <Input
              type="number"
              placeholder="5"
              value={numSteps}
              onChange={(e) => setNumSteps(e.target.value)}
              className="bg-background/50 border-accent/50 text-accent font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Each step dilutes the previous concentration by this factor
            </p>
          </div>
        </div>

        {/* Calculate Button */}
        <Button 
          onClick={calculateSerialDilution}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold tracking-wider"
          style={{
            boxShadow: `
              0 0 10px var(--color-neon-orange),
              0 0 20px var(--color-neon-orange),
              inset 0 0 10px var(--color-neon-orange)
            `
          }}
        >
          CALCULATE SERIES
        </Button>

        {/* Dilution Factor Display */}
        {dilutionFactor !== null && (
          <div className="mt-6 p-4 bg-card border border-accent rounded">
            <p className="text-xs text-accent/70 tracking-wider mb-1">DILUTION FACTOR</p>
            <p className="text-2xl font-bold text-accent font-mono">
              {dilutionFactor.toFixed(4)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Each step is diluted by this factor
            </p>
          </div>
        )}

        {/* Series Results */}
        {serialSeries.length > 0 && (
          <div className="mt-6 p-6 bg-card border-2 border-terminal-green rounded">
            <p className="text-xs text-terminal-green/70 tracking-wider mb-4">DILUTION SERIES</p>
            <div className="space-y-2">
              {serialSeries.map(({ step, concentration }) => (
                <div 
                  key={step}
                  className="flex justify-between items-center p-3 bg-background/50 border border-terminal-green/30 rounded"
                >
                  <span className="text-terminal-green font-mono font-bold">STEP {step}</span>
                  <span className="text-terminal-green font-mono text-lg"
                    style={{
                      textShadow: '0 0 10px var(--color-terminal-green)'
                    }}
                  >
                    {concentration.toFixed(4)} {serialConcUnit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
