import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Router as WouterRouter, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import HomeJP from "./pages/Home-JP";

function MarketingRouter() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/ja"} component={HomeJP} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/** Embedded under https://rawstock.live/lp/ — Japanese by default; English at /lp/EN. */
function EmbeddedLpRouter() {
  return (
    <WouterRouter base="/lp">
      <Switch>
        <Route path="/EN" component={Home} />
        <Route path="/en" component={Home} />
        <Route path="/ja" component={HomeJP} />
        <Route path="/" component={HomeJP} />
        <Route component={HomeJP} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  if (import.meta.env.BASE_URL === "/lp/") {
    return (
      <ErrorBoundary>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <EmbeddedLpRouter />
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <MarketingRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
