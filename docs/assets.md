# Assets

## Photography

All photos are from Unsplash under the free [Unsplash License](https://unsplash.com/license) (none are Unsplash+). They were downloaded from `images.unsplash.com`, resized to at most 2,000 px on the long edge, and are served from `public/images/` with `next/image`. Photographers are credited on `/credits`, linked from the footer.

| File | Unsplash page | Photographer | Profile | Used on |
|-|-|-|-|-|
| `public/images/students.jpg` | https://unsplash.com/photos/-X4Qx4_4iMU | Vitaly Gariev | https://unsplash.com/@silverkblack | Home, "Who shares with Splitflow": student associations; `/credits` |
| `public/images/team.jpg` | https://unsplash.com/photos/g1Kr4Ozfoac | Brooke Cagle | https://unsplash.com/@brookecagle | Home, "Who shares with Splitflow": hackathon teams; `/credits` |
| `public/images/market.jpg` | https://unsplash.com/photos/eE-ffApg7oI | Kyle Nieber | https://unsplash.com/@kylenieber | Home, "Who shares with Splitflow": local co-ops and partners; `/credits` |

## Monark brand assets

From `lovable-migration/brand-refs/` and the [monark-community/website](https://github.com/monark-community/website) repo, used per `monark-brand-guidelines.md`:

| File | Source | Used for |
|-|-|-|
| `public/brand/monark-mark.svg`, `src/app/icon.svg` | brand-refs `logos/svg/standalone/logo-branded-standalone.svg` | Header brand, favicon, wallet prompt, connect gate |
| `public/brand/monark-horizontal-{light,dark}.svg` | website `public/vectors/brand/horizontal/` | Footer Monark band |
| `public/brand/monark-vertical-{light,dark}.svg` | brand-refs `logos/svg/vertical/` | 404 page |
| `public/brand/monark-mesh.svg` | website `public/vectors/decorative/monark-mesh.svg` | Home hero only (once per site) |
| `public/brand/socials/*.svg` | website `public/vectors/socials/` | Footer social links (recoloured to `foreground` through a CSS mask for contrast) |

## Built in code

- Split fan (hero and split page), share bars, lifecycle diagram (`/how-it-works`), approval progress bars: flat orange line art in SVG/JSX, no gradients.
- Open Graph image: generated per locale with `next/og` (`src/app/[locale]/opengraph-image.tsx`).
- Icons: [Lucide](https://lucide.dev).
- Type: Nunito Sans via `next/font/google`.
