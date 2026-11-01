import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

const CATEGORIES = [
  'World', 'Politics', 'Business', 'Tech', 'Science',
  'Health', 'Sports', 'Entertainment', 'Environment', 'Crime', 'Animals'
];

export const DesignSystemShowcase: React.FC = () => {
  const [theme, setTheme] = useState<'paper' | 'night'>('paper');
  const [readingSpeed, setReadingSpeed] = useState([1.0]);

  const toggleTheme = (isNight: boolean) => {
    const next = isNight ? 'night' : 'paper';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-paper text-ink p-8 transition-colors duration-300 font-ui"
    >
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Top Control Bar */}
        <header className="flex items-center justify-between border-b-2 border-ink pb-4">
          <div>
            <span className="font-masthead text-4xl tracking-tight block">The World Desk</span>
            <span className="font-ui text-xs uppercase tracking-widest text-ink-muted">Design System & Component Kit Specification (v2.0)</span>
          </div>
          <div className="flex items-center gap-4 bg-paper-alt px-4 py-2 rounded-sm border border-paper-border">
            <span className="font-ui text-xs font-bold uppercase text-ink-secondary">Theme: {theme === 'paper' ? 'Paper (Day)' : 'Night Edition'}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-muted">Day</span>
              <Switch
                checked={theme === 'night'}
                onCheckedChange={toggleTheme}
                aria-label="Toggle Night Edition"
              />
              <span className="text-xs text-ink-muted">Night</span>
            </div>
          </div>
        </header>

        {/* 1. Typography Hierarchy */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-headline text-xl font-bold uppercase tracking-wider text-ink">1. Broadsheet Typography Scale</h2>
            <div className="flex-1 border-b border-paper-border" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-paper-alt p-6 rounded-sm border border-paper-border">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-ink-muted block font-mono">Masthead: UnifrakturCook</span>
                <span className="font-masthead text-5xl text-ink">The World Desk</span>
              </div>
              <div>
                <span className="text-xs text-ink-muted block font-mono">Headline XL: Playfair Display Bold</span>
                <h1 className="font-headline text-3xl font-bold text-ink leading-tight">
                  Floods Displace 50,000 Families in Record Monsoon Inundation
                </h1>
              </div>
              <div>
                <span className="text-xs text-ink-muted block font-mono">Headline MD: Playfair Display SemiBold</span>
                <h3 className="font-headline text-xl font-semibold text-ink">
                  International Observers Convene as Conservation Treaties Face Scrutiny
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-ink-muted block font-mono">Prose Body: Source Serif 4 (1.125rem / 1.7)</span>
                <p className="font-body text-base text-ink leading-relaxed">
                  The river breached embankments shortly before dawn, inundating low-lying districts across the valley. Field units reported rapid water level rises, cutting off provincial highways and stranding thousands of agricultural workers. Emergency relief convoys were dispatched under heavy escort as municipal authorities declared a maximum state of emergency.
                </p>
              </div>
              <div className="flex gap-6 pt-2">
                <div>
                  <span className="text-xs text-ink-muted block font-mono">UI Chrome: Inter</span>
                  <span className="font-ui text-sm font-medium text-ink-secondary">The Hindu · Chennai, India · 2h ago</span>
                </div>
                <div>
                  <span className="text-xs text-ink-muted block font-mono">Data / Tokens: IBM Plex Mono</span>
                  <span className="font-mono text-xs text-ink bg-paper px-2 py-1 border border-paper-border rounded-xs">
                    ID: #89201 · LATENCY: 24ms · 60 FPS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Ink-Stamp Category Badges */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-headline text-xl font-bold uppercase tracking-wider text-ink">2. Ink-Stamp Category System</h2>
            <div className="flex-1 border-b border-paper-border" />
          </div>
          <p className="text-xs text-ink-muted">
            Physically stamped aesthetic with tactile tilt (-0.5deg), high contrast, and crisp ink borders.
          </p>
          <div className="flex flex-wrap gap-3 p-4 bg-paper-alt border border-paper-border rounded-sm">
            {CATEGORIES.map((cat) => (
              <Badge key={cat} category={cat}>
                {cat}
              </Badge>
            ))}
            <Badge variant="accent">
              🔴 Breaking
            </Badge>
            <Badge variant="positive">
              ● Live 60 FPS
            </Badge>
          </div>
        </section>

        {/* 3. Broadsheet Cards & Newspaper Rules */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-headline text-xl font-bold uppercase tracking-wider text-ink">3. Broadsheet Cards (Top Rules & Ink-Paper Contrast)</h2>
            <div className="flex-1 border-b border-paper-border" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="news-rule-t">
              <CardHeader>
                <div className="flex justify-between items-center mb-1">
                  <Badge category="Animals">Animals</Badge>
                  <span className="font-mono text-[0.6875rem] text-ink-muted">2h ago</span>
                </div>
                <CardTitle>Snow Leopard Population Shows Resilient Recovery in High Himalayas</CardTitle>
                <CardDescription>Mongabay Wildlife · Global Census</CardDescription>
              </CardHeader>
              <CardContent>
                Camera trap arrays across the Ladakh range have documented a 22 percent increase in breeding pairs over the previous quadrennial survey.
              </CardContent>
              <CardFooter className="justify-between">
                <span className="text-ink-secondary text-xs">Read Full Report →</span>
                <Button size="xs" variant="outline">Archive</Button>
              </CardFooter>
            </Card>

            <Card className="news-rule-t">
              <CardHeader>
                <div className="flex justify-between items-center mb-1">
                  <Badge category="World">World</Badge>
                  <span className="font-mono text-[0.6875rem] text-ink-muted">45m ago</span>
                </div>
                <CardTitle>Maritime Trade Routes Rerouted Amidst Regional Strait Tensions</CardTitle>
                <CardDescription>Reuters · Singapore / London</CardDescription>
              </CardHeader>
              <CardContent>
                Container freight indexes climbed sharply this morning following precautionary notices issued by international shipping conferences.
              </CardContent>
              <CardFooter className="justify-between">
                <span className="text-ink-secondary text-xs">Compare Outlets →</span>
                <Button size="xs" variant="outline">Inspect</Button>
              </CardFooter>
            </Card>

            <Card className="news-rule-t">
              <CardHeader>
                <div className="flex justify-between items-center mb-1">
                  <Badge category="Environment">Environment</Badge>
                  <span className="font-mono text-[0.6875rem] text-accent font-bold">● Breaking</span>
                </div>
                <CardTitle>Arctic Ice Sheet Expedition Recovers Pristine Core Samples</CardTitle>
                <CardDescription>ScienceDaily · Longyearbyen</CardDescription>
              </CardHeader>
              <CardContent>
                Drilling crews working through polar night conditions confirmed retrieval of undisturbed ice strata dating back three hundred millennia.
              </CardContent>
              <CardFooter className="justify-between">
                <span className="text-ink-secondary text-xs">Read Dispatch →</span>
                <Button size="xs" variant="destructive">Urgent</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* 4. Interactive Components Kit */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-headline text-xl font-bold uppercase tracking-wider text-ink">4. Interactive Components (Radix Primitives)</h2>
            <div className="flex-1 border-b border-paper-border" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-paper-alt p-6 border border-paper-border rounded-sm">
            {/* Tabs & Buttons */}
            <div className="space-y-4">
              <span className="text-xs text-ink-muted font-mono block">Category Rail Tabs & Buttons</span>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="all">All Dispatches</TabsTrigger>
                  <TabsTrigger value="breaking">Breaking Feed</TabsTrigger>
                  <TabsTrigger value="animals">Wildlife Wire</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="pt-2 text-xs font-body text-ink-secondary">
                  Showing all real-time articles synchronized via backend Server-Sent Events.
                </TabsContent>
                <TabsContent value="breaking" className="pt-2 text-xs font-body text-ink-secondary">
                  High-priority stories with breaking score ≥ 75.
                </TabsContent>
                <TabsContent value="animals" className="pt-2 text-xs font-body text-ink-secondary">
                  Filtered news from Mongabay, TRAFFIC, and ScienceDaily.
                </TabsContent>
              </Tabs>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="default">Primary Broadsheet</Button>
                <Button variant="outline">Outline Rule</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="destructive">Breaking Alert</Button>
              </div>
            </div>

            {/* Sliders & Skeleton */}
            <div className="space-y-4">
              <span className="text-xs text-ink-muted font-mono block">Settings Slider & CSS Shimmer Skeletons</span>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-ink">
                  <span>Reading Mode Speed</span>
                  <span className="font-mono">{readingSpeed[0]}x</span>
                </div>
                <Slider
                  value={readingSpeed}
                  onValueChange={setReadingSpeed}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  aria-label="Reading Mode Speed Slider"
                />
              </div>

              <div className="pt-2 space-y-2">
                <span className="text-xs text-ink-muted font-mono block">CSS Shimmer Loading State (No JS)</span>
                <div className="news-skeleton h-5 w-3/4" />
                <div className="news-skeleton h-3 w-1/2" />
                <div className="news-skeleton h-12 w-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-paper-border pt-4 text-center text-xs text-ink-muted font-mono">
          AI World News Desk · Newspaper Design System 2.0 · Paper Grain SVG Active
        </footer>
      </div>
    </div>
  );
};

export default DesignSystemShowcase;

