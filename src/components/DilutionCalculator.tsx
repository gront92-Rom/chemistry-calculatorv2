'use client';

/*
Design Philosophy: Retro-Futurism with 1980s Scientific Computing Aesthetic
Dilution Calculator - C₁×V₁ = C₂×V₂ formula with serial dilution support
Now supports independent units for each parameter with proper conversion
*/

import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ConcentrationUnit = "mol/L" | "mmol/L" | "g/L" | "mg/mL" | "µg/mL";
type VolumeUnit = "L" | "mL" | "µL";
type SolveFor = "C1" | "V1" | "C2" | "V2";

// Concentration conversion factors to common base (g/L for mass, mol/L for molar)
// Mass concentration units
const massConcentrationTo_g_per_L: Record<"g/L" | "mg/mL" | "µg/mL", number> = {
  "g/L": 1,
  "mg/mL": 1, // 1 mg/mL = 1 g/L
  "µg/mL": 0.001, // 1 µg/mL = 0.001 g/L = 1 mg/L
};

// Molar concentration units
const molarConcentrationTo_mol_per_L: Record<"mol/L" | "mmol/L", number> = {
  "mol/L": 1,
  "mmol/L": 0.001,
};

// Volume conversion factors to Liters
const volumeTo_L: Record<VolumeUnit, number> = {
  "L": 1,
  "mL": 0.001,
  "µL": 0.000001,
};

// Check if unit is molar
const isMolarUnit = (unit: ConcentrationUnit): unit is "mol/L" | "mmol/L" => {
  return unit === "mol/L" || unit === "mmol/L";
};

// Check if unit is mass concentration
const isMassUnit = (unit: ConcentrationUnit): unit is "g/L" | "mg/mL" | "µg/mL" => {
  return unit === "g/L" || unit === "mg/mL" || unit === "µg/mL";
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
  const [warning, setWarning] = useState<string>("");

  // Serial dilution state
  const [startConc, setStartConc] = useState<string>("100");
  const [finalConc, setFinalConc] = useState<string>("1");
  const [numSteps, setNumSteps] = useState<string>("5");
  const [serialConcUnit, setSerialConcUnit] = useState<ConcentrationUnit>("mg/mL");
  const [serialSeries, setSerialSeries] = useState<{ step: number; concentration: number }[]>([]);
  const [dilutionFactor, setDilutionFactor] = useState<number | null>(null);

  // Convert concentration to standard form (value in its base unit type)
  const getConcentrationInBase = (value: number, unit: ConcentrationUnit): { value: number; isMolar: boolean } => {
    if (isMolarUnit(unit)) {
      return { value: value * molarConcentrationTo_mol_per_L[unit], isMolar: true };
    } else {
      return { value: value * massConcentrationTo_g_per_L[unit], isMolar: false };
    }
  };

  // Convert from base to target unit
  const convertConcentration = (value: number, fromUnit: ConcentrationUnit, toUnit: ConcentrationUnit): number => {
    // Get value in base
    const base = getConcentrationInBase(value, fromUnit);
    
    // Convert to target
    if (isMolarUnit(toUnit)) {
      return base.value / molarConcentrationTo_mol_per_L[toUnit];
    } else {
      return base.value / massConcentrationTo_g_per_L[toUnit];
    }
  };

  // Convert volume to Liters
  const convertVolumeTo_L = (value: number, unit: VolumeUnit): number => {
    return value * volumeTo_L[unit];
  };

  // Convert volume from Liters to target unit
  const convertVolumeFrom_L = (value: number, unit: VolumeUnit): number => {
    return value / volumeTo_L[unit];
  };

  const calculateSingleDilution = () => {
    const c1Val = parseFloat(c1);
    const v1Val = parseFloat(v1);
    const c2Val = parseFloat(c2);
    const v2Val = parseFloat(v2);

    // Check for valid inputs
    const missingInputs: string[] = [];
    if (solveFor !== "C1" && (isNaN(c1Val) || c1Val <= 0)) missingInputs.push("C₁");
    if (solveFor !== "V1" && (isNaN(v1Val) || v1Val <= 0)) missingInputs.push("V₁");
    if (solveFor !== "C2" && (isNaN(c2Val) || c2Val <= 0)) missingInputs.push("C₂");
    if (solveFor !== "V2" && (isNaN(v2Val) || v2Val <= 0)) missingInputs.push("V₂");

    if (missingInputs.length > 0) {
      setWarning(`Please enter valid values for: ${missingInputs.join(", ")}`);
      return;
    }

    // Check for unit compatibility
    const c1IsMolar = isMolarUnit(c1Unit);
    const c2IsMolar = isMolarUnit(c2Unit);
    
    if (c1IsMolar !== c2IsMolar) {
      setWarning("⚠️ Warning: Mixing molar (mol/L) and mass concentration units may give incorrect results. Use consistent unit types.");
    } else {
      setWarning("");
    }

    // Get all values in base units
    const c1Base = getConcentrationInBase(c1Val, c1Unit);
    const c2Base = getConcentrationInBase(c2Val, c2Unit);
    const v1_L = convertVolumeTo_L(v1Val, v1Unit);
    const v2_L = convertVolumeTo_L(v2Val, v2Unit);

    let resultValue: number;
    let resultLabel: string;
    let displayUnit: string;

    switch (solveFor) {
      case "C1":
        // C1 = (C2 × V2) / V1
        // C1_base = (C2_base × V2_L) / V1_L
        resultValue = (c2Base.value * v2_L) / v1_L;
        // Convert to C1's unit
        if (c1IsMolar) {
          resultValue = resultValue / molarConcentrationTo_mol_per_L[c1Unit as "mol/L" | "mmol/L"];
        } else {
          resultValue = resultValue / massConcentrationTo_g_per_L[c1Unit as "g/L" | "mg/mL" | "µg/mL"];
        }
        displayUnit = c1Unit;
        resultLabel = `C₁ = ${resultValue.toFixed(4)} ${displayUnit}`;
        break;
        
      case "V1":
        // V1 = (C2 × V2) / C1
        // V1_L = (C2_base × V2_L) / C1_base
        resultValue = (c2Base.value * v2_L) / c1Base.value;
        // Convert to V1's unit
        resultValue = convertVolumeFrom_L(resultValue, v1Unit);
        displayUnit = v1Unit;
        resultLabel = `V₁ = ${resultValue.toFixed(4)} ${displayUnit}`;
        break;
        
      case "C2":
        // C2 = (C1 × V1) / V2
        resultValue = (c1Base.value * v1_L) / v2_L;
        // Convert to C2's unit
        if (c2IsMolar) {
          resultValue = resultValue / molarConcentrationTo_mol_per_L[c2Unit as "mol/L" | "mmol/L"];
        } else {
          resultValue = resultValue / massConcentrationTo_g_per_L[c2Unit as "g/L" | "mg/mL" | "µg/mL"];
        }
        displayUnit = c2Unit;
        resultLabel = `C₂ = ${resultValue.toFixed(4)} ${displayUnit}`;
        break;
        
      case "V2":
        // V2 = (C1 × V1) / C2
        resultValue = (c1Base.value * v1_L) / c2Base.value;
        // Convert to V2's unit
        resultValue = convertVolumeFrom_L(resultValue, v2Unit);
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
          <Label className="text-accent text-xs tracking-wider mb-2 block">● FINAL SOLUTION (C₂, V₂)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                type="number"
                placeholder="C₂"
                value={c2}
                onChange={(e) => setC2(e.target.value)}
                disabled={solveFor === "C2"}
                className="bg-background/50 border-accent/50 text-accent font-mono disabled:opacity-50"
              />
            </div>
            <div>
              <Select 
                value={c2Unit} 
                onValueChange={(v) => setC2Unit(v as ConcentrationUnit)}
                disabled={solveFor === "C2"}
              >
                <SelectTrigger className="bg-background/50 border-accent/50 text-accent font-mono disabled:opacity-50">
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
                className="bg-background/50 border-accent/50 text-accent font-mono disabled:opacity-50"
              />
            </div>
            <div>
              <Select 
                value={v2Unit} 
                onValueChange={(v) => setV2Unit(v as VolumeUnit)}
                disabled={solveFor === "V2"}
              >
                <SelectTrigger className="bg-background/50 border-accent/50 text-accent font-mono disabled:opacity-50">
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

        {/* Warning Message */}
        {warning && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded text-yellow-500 text-xs">
            {warning}
          </div>
        )}

        {/* Calculate Button */}
        <Button 
          onClick={calculateSingleDilution}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wider"
          style={{
            boxShadow: `
              0 0 10px var(--color-neon-cyan),
              0 0 20px var(--color-neon-cyan),
              inset 0 0 10px var(--color-neon-cyan)
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
