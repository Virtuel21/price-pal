import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Replace, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ExtensionPopup() {
  const { toast } = useToast();
  const [oldPrice, setOldPrice] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [foundCount, setFoundCount] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Fonction pour vérifier si le content script est chargé
  const ensureContentScript = async (tabId: number) => {
    try {
      // Essayer de ping le content script
      await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      return true;
    } catch (error) {
      // Le content script n'est pas chargé, on l'injecte
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        return true;
      } catch (injectError) {
        console.error('Failed to inject content script:', injectError);
        return false;
      }
    }
  };

  const handleCheckPrices = async () => {
    if (!oldPrice.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un ancien prix",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    setFoundCount(null);

    try {
      // Récupérer l'onglet actif
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error("Aucun onglet actif trouvé");
      }

      // S'assurer que le content script est chargé
      const scriptLoaded = await ensureContentScript(tab.id);
      if (!scriptLoaded) {
        throw new Error("Impossible de charger le script sur cette page (peut-être une page système de Chrome)");
      }

      // Envoyer un message au content script pour chercher les prix
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'findPrices',
        oldPrice: oldPrice.trim(),
      });

      if (response.success) {
        setFoundCount(response.count);
        toast({
          title: response.count > 0 ? "Prix trouvés !" : "Aucun prix trouvé",
          description: response.count > 0
            ? `${response.count} occurrence(s) de "${oldPrice}" trouvée(s) sur la page`
            : `Le prix "${oldPrice}" n'a pas été trouvé sur la page`,
        });
      } else {
        throw new Error(response.error || "Erreur inconnue");
      }
    } catch (error) {
      console.error('Error checking prices:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de vérifier les prix",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!oldPrice.trim() || !newPrice.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer l'ancien et le nouveau prix",
        variant: "destructive",
      });
      return;
    }

    if (foundCount === null) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord vérifier les prix",
        variant: "destructive",
      });
      return;
    }

    if (foundCount === 0) {
      toast({
        title: "Erreur",
        description: "Aucun prix à remplacer",
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error("Aucun onglet actif trouvé");
      }

      // S'assurer que le content script est chargé
      const scriptLoaded = await ensureContentScript(tab.id);
      if (!scriptLoaded) {
        throw new Error("Impossible de charger le script sur cette page");
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'replacePrices',
        oldPrice: oldPrice.trim(),
        newPrice: newPrice.trim(),
      });

      if (response.success) {
        toast({
          title: "Succès !",
          description: `${response.count} prix mis à jour avec succès`,
        });
        setFoundCount(null);
        // On garde les champs remplis pour faciliter les remplacements multiples
      } else {
        throw new Error(response.error || "Erreur inconnue");
      }
    } catch (error) {
      console.error('Error applying changes:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'appliquer les changements",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleDeletePrices = async () => {
    if (!oldPrice.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un prix à supprimer",
        variant: "destructive",
      });
      return;
    }

    if (foundCount === null) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord vérifier les prix",
        variant: "destructive",
      });
      return;
    }

    if (foundCount === 0) {
      toast({
        title: "Erreur",
        description: "Aucun prix à supprimer",
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error("Aucun onglet actif trouvé");
      }

      // S'assurer que le content script est chargé
      const scriptLoaded = await ensureContentScript(tab.id);
      if (!scriptLoaded) {
        throw new Error("Impossible de charger le script sur cette page");
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'replacePrices',
        oldPrice: oldPrice.trim(),
        newPrice: '', // Chaîne vide pour supprimer
      });

      if (response.success) {
        toast({
          title: "Supprimé !",
          description: `${response.count} prix supprimé${response.count > 1 ? 's' : ''} avec succès`,
        });
        setFoundCount(null);
        // On garde l'ancien prix pour faciliter les suppressions multiples
      } else {
        throw new Error(response.error || "Erreur inconnue");
      }
    } catch (error) {
      console.error('Error deleting prices:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer les prix",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="w-96 bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">$</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold">Price Updater</h1>
            <p className="text-xs text-muted-foreground">Remplacer les prix sur la page</p>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Champ Ancien Prix */}
        <div className="space-y-2">
          <Label htmlFor="oldPrice" className="text-sm font-medium">
            Ancien prix
          </Label>
          <Input
            id="oldPrice"
            type="text"
            placeholder="Ex: 19.99 ou 19,99"
            value={oldPrice}
            onChange={(e) => setOldPrice(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            💡 Trouvera automatiquement "19.99" et "19,99"
          </p>
        </div>

        {/* Champ Nouveau Prix */}
        <div className="space-y-2">
          <Label htmlFor="newPrice" className="text-sm font-medium">
            Nouveau prix <span className="text-muted-foreground font-normal">(optionnel)</span>
          </Label>
          <Input
            id="newPrice"
            type="text"
            placeholder="Ex: 24.99 (laisser vide pour supprimer)"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            💡 Laissez vide et cliquez "Supprimer" pour enlever le prix
          </p>
        </div>

        {/* Affichage du résultat */}
        {foundCount !== null && (
          <div className={`p-3 rounded-lg border ${
            foundCount > 0
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
              : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
          }`}>
            <div className="flex items-center gap-2">
              {foundCount > 0 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    {foundCount} prix trouvé{foundCount > 1 ? 's' : ''} sur la page
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Aucun prix trouvé sur la page
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Boutons */}
        <div className="space-y-3">
          <Button
            onClick={handleCheckPrices}
            disabled={isChecking || !oldPrice.trim()}
            className="w-full"
            variant="outline"
          >
            <Search className="w-4 h-4 mr-2" />
            {isChecking ? 'Vérification...' : 'Vérifier les prix'}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleDeletePrices}
              disabled={isApplying || !oldPrice.trim() || foundCount === null || foundCount === 0}
              className="w-full"
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isApplying ? 'Suppression...' : 'Supprimer'}
            </Button>

            <Button
              onClick={handleApplyChanges}
              disabled={isApplying || !oldPrice.trim() || !newPrice.trim() || foundCount === null || foundCount === 0}
              className="w-full"
            >
              <Replace className="w-4 h-4 mr-2" />
              {isApplying ? 'Application...' : 'Remplacer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
