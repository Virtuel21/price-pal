import { ExtensionPopup } from "@/components/ExtensionPopup";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Price Updater Extension
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Chrome extension for updating prices in CMS code editors. 
            This is a demo preview of the extension popup.
          </p>
        </div>
        
        <div className="flex justify-center">
          <div className="rounded-xl border border-border shadow-2xl overflow-hidden">
            <ExtensionPopup />
          </div>
        </div>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            To use as an actual Chrome extension, build and load as unpacked.
          </p>
          <a 
            href="#/options" 
            className="text-primary hover:underline text-sm"
          >
            View Options Page →
          </a>
        </div>
      </div>
    </div>
  );
};

export default Index;
