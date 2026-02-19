'use client';

/*
Design: Retro-futuristic calculator with neon cyan borders and monospace displays
Formula: Mass = Concentration × Volume
*/

import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

type ConcentrationUnit = "g/L" | "mg/mL" | "mol/L";
type VolumeUnit = "L" | "mL" | "μL";
type MassUnit = "kg" | "g" | "mg" | "μg";

export default function MassCalculator() {
  const { addEntry } = useCalculationHistory();
  const [concentration, setConcentration] = useState<string>("2.5");
  const [concentrationUnit, setConcentrationUnit] = useState<ConcentrationUnit>("mg/mL");
  const [volume, setVolume] = useState<string>("250");
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("mL");
  const [molarMass, setMolarMass] = useState<string>("180.16");
  const [result, setResult] = useState<{ value: number; unit: MassUnit } | null>(null);

  const calculateMass = () => {
    const concValue = parseFloat(concentration);
    const volValue = parseFloat(volume);
    
    if (isNaN(concValue) || isNaN(volValue)) {
      return;
    }

    // Convert everything to g and L for calculation
    let concInGPerL = concValue;
    
    if (concentrationUnit === "mg/mL") {
      concInGPerL = concValue; // mg/mL = g/L
    } else if (concentrationUnit === "mol/L") {
      const molarMassValue = parseFloat(molarMass);
      if (!isNaN(molarMassValue)) {
        concInGPerL = concValue * molarMassValue;
      }
    }
    
    let volInL = volValue;
    if (volumeUnit === "mL") {
      volInL = volValue / 1000;
    } else if (volumeUnit === "μL") {
      volInL = volValue / 1000000;
    }
    
    // Calculate mass in grams
    let massInG = concInGPerL * volInL;
    
    // Smart unit selection
    let finalMass: number;
    let finalUnit: MassUnit;
    
    if (massInG >= 1000) {
      finalMass = massInG / 1000;
      finalUnit = "kg";
    } else if (massInG >= 1) {
      finalMass = massInG;
      finalUnit = "g";
    } else if (massInG >= 0.001) {
      finalMass = massInG * 1000;
      finalUnit = "mg";
    } else {
      finalMass = massInG * 1000000;
      finalUnit = "μg";
    }
    
    const resultData = { value: parseFloat(finalMass.toFixed(4)), unit: finalUnit };
    setResult(resultData);
    
    // Add to history
    addEntry({
      type: "mass",
      inputs: { concentration: concValue, concentrationUnit, volume: volValue, volumeUnit },
      result: `${resultData.value} ${resultData.unit}`
    });
  };

  return (
    <div className="space-y-6">
      {/* Formula Display */}
      <div className="border border-primary/50 bg-primary/10 p-4 text-center">
        <p className="text-primary font-bold text-lg mono-display neon-glow">
          MASS = CONCENTRATION × VOLUME
        </p>
      </div>

      {/* Concentration Input */}
      <div className="space-y-2">
        <Label className="text-xs text-primary tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full" />
          CONCENTRATION
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={concentration}
            onChange={(e) => setConcentration(e.target.value)}
            className="flex-1 bg-black border-2 border-primary/50 text-primary mono-display text-lg font-bold focus:border-primary focus:ring-primary"
            placeholder="0.00"
          />
          <Select value={concentrationUnit} onValueChange={(v) => setConcentrationUnit(v as ConcentrationUnit)}>
            <SelectTrigger className="w-32 bg-secondary border-2 border-primary/50 text-primary font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="g/L">g/L</SelectItem>
              <SelectItem value="mg/mL">mg/mL</SelectItem>
              <SelectItem value="mol/L">mol/L</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Molar Mass (conditional) */}
      {concentrationUnit === "mol/L" && (
        <div className="border border-accent/50 bg-accent/10 p-4 space-y-2 animate-in fade-in duration-300">
          <Label className="text-xs text-accent tracking-widest">MOLAR MASS</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={molarMass}
              onChange={(e) => setMolarMass(e.target.value)}
              className="flex-1 bg-black border-2 border-accent/50 text-accent mono-display text-lg font-bold"
              placeholder="0.00"
            />
            <span className="text-accent font-bold">g/mol</span>
          </div>
        </div>
      )}

      {/* Volume Input */}
      <div className="space-y-2">
        <Label className="text-xs text-primary tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full" />
          VOLUME
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            className="flex-1 bg-black border-2 border-primary/50 text-primary mono-display text-lg font-bold focus:border-primary focus:ring-primary"
            placeholder="0.00"
          />
          <Select value={volumeUnit} onValueChange={(v) => setVolumeUnit(v as VolumeUnit)}>
            <SelectTrigger className="w-32 bg-secondary border-2 border-primary/50 text-primary font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="L">L</SelectItem>
              <SelectItem value="mL">mL</SelectItem>
              <SelectItem value="μL">μL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calculate Button */}
      <Button
        onClick={calculateMass}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-bold text-sm tracking-widest py-6 neon-border"
      >
        <Calculator className="w-5 h-5 mr-2" />
        CALCULATE MASS
      </Button>

      {/* Result Display */}
      {result && (
        <div className="border-2 border-terminal-green bg-terminal-green/10 p-6 space-y-2 animate-in fade-in duration-300"
          style={{
            boxShadow: `
              0 0 10px var(--color-terminal-green),
              inset 0 0 10px var(--color-terminal-green)
            `
          }}
        >
          <p className="text-xs text-terminal-green tracking-widest">MASS RESULT</p>
          <p className="text-5xl font-bold mono-display text-terminal-green"
            style={{
              textShadow: `
                0 0 10px var(--color-terminal-green),
                0 0 20px var(--color-terminal-green)
              `
            }}
          >
            {result.value}
          </p>
          <p className="text-lg text-terminal-green font-bold">{result.unit}</p>
          <p className="text-xs text-terminal-green/70 flex items-center gap-2 mt-3">
            <span className="w-1.5 h-1.5 bg-terminal-green rounded-full animate-pulse" />
            AUTO-SELECTED UNIT BASED ON RESULT
          </p>
        </div>
      )}
    </div>
  );
}
