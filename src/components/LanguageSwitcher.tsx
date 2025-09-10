import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { Globe } from "lucide-react";

export const LanguageSwitcher = () => {
  const { language, changeLanguage } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')}
      className="h-9 w-9 flex items-center justify-center"
    >
      <Globe className="h-4 w-4" />
      <span className="sr-only">Change language</span>
    </Button>
  );
};