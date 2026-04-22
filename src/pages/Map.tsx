import { ExternalLink, MapPin, ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PLATFORMS = [
  {
    name: 'CeX Livingston',
    url: 'https://uk.webuy.com/',
    description: 'Buy, sell & exchange electronics',
    type: 'Local',
    icon: '🏪',
  },
  {
    name: 'eBay UK',
    url: 'https://www.ebay.co.uk/',
    description: 'Maior marketplace online do Reino Unido',
    type: 'Online',
    icon: '🛒',
  },
  {
    name: 'Back Market UK',
    url: 'https://www.backmarket.co.uk/',
    description: 'Plataforma especializada em recondicionados',
    type: 'Online',
    icon: '♻️',
  },
  {
    name: 'Gumtree',
    url: 'https://www.gumtree.com/',
    description: 'Anúncios locais — ideal para venda rápida',
    type: 'Local/Online',
    icon: '📋',
  },
  {
    name: 'Facebook Marketplace',
    url: 'https://www.facebook.com/marketplace/',
    description: 'Venda local sem taxas',
    type: 'Local/Online',
    icon: '👥',
  },
  {
    name: 'Swappa',
    url: 'https://swappa.com/',
    description: 'Marketplace focado em electrónicos usados',
    type: 'Online',
    icon: '📱',
  },
]

export function Map() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Mapa & Plataformas</h1>
        <p className="text-text-muted text-sm mt-0.5">Livingston, West Lothian, Scotland</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              Livingston, Scotland
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-3">
            <iframe
              title="Livingston, Scotland"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-3.6191%2C55.8700%2C-3.4800%2C55.9200&layer=mapnik&marker=55.8835%2C-3.5175"
              className="w-full h-80 border-0"
              loading="lazy"
            />
            <div className="p-3 bg-surface text-xs text-text-muted">
              <a
                href="https://www.openstreetmap.org/#map=13/55.8835/-3.5175"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline flex items-center gap-1"
              >
                Ver mapa completo <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Platforms */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-accent" />
            Plataformas de venda
          </h2>
          <div className="space-y-2">
            {PLATFORMS.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-surface p-4 transition-all group"
              >
                <span className="text-2xl shrink-0">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-text-primary text-sm group-hover:text-accent transition-colors">{p.name}</p>
                    <span className="text-xs text-text-muted border border-border rounded-full px-2 py-0.5">{p.type}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{p.description}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-text-muted group-hover:text-accent transition-colors shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
