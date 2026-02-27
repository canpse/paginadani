/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const SOURCE = path.resolve(__dirname, '../public/assets/source/pack-vintage-01.png');
const ROOT = path.resolve(__dirname, '../public/assets');

const crops = [
  {
    out: 'fundos/hero/header-vintage-01.png',
    left: 100,
    top: 20,
    width: 1340,
    height: 220,
  },
  {
    out: 'decorativos/ornamentos/lobo-lateral-esq-01.png',
    left: 30,
    top: 200,
    width: 420,
    height: 760,
  },
  {
    out: 'decorativos/ornamentos/canto-inferior-esq-01.png',
    left: 0,
    top: 730,
    width: 320,
    height: 294,
  },
  {
    out: 'decorativos/ornamentos/canto-inferior-dir-01.png',
    left: 1180,
    top: 700,
    width: 356,
    height: 324,
  },
  {
    out: 'decorativos/ornamentos/ornamento-floral-direito-01.png',
    left: 1060,
    top: 120,
    width: 440,
    height: 190,
  },
  {
    out: 'decorativos/fitas/titulo-latest-posts-01.png',
    left: 455,
    top: 215,
    width: 360,
    height: 96,
  },
  {
    out: 'decorativos/fitas/botao-read-more-01.png',
    left: 640,
    top: 430,
    width: 230,
    height: 90,
  },
  {
    out: 'posts/capas/card-post-hero-01.png',
    left: 210,
    top: 280,
    width: 845,
    height: 260,
  },
  {
    out: 'posts/capas/card-post-mid-01.png',
    left: 220,
    top: 495,
    width: 840,
    height: 230,
  },
  {
    out: 'posts/capas/card-post-low-01.png',
    left: 220,
    top: 695,
    width: 840,
    height: 230,
  },
  {
    out: 'posts/thumbs/card-photo-hero-01.png',
    left: 240,
    top: 332,
    width: 270,
    height: 190,
  },
  {
    out: 'posts/thumbs/wolf-and-books-01.png',
    left: 255,
    top: 545,
    width: 300,
    height: 190,
  },
  {
    out: 'posts/thumbs/open-book-candles-01.png',
    left: 255,
    top: 735,
    width: 320,
    height: 205,
  },
  {
    out: 'decorativos/ornamentos/sidebar-about-01.png',
    left: 1035,
    top: 240,
    width: 420,
    height: 470,
  },
  {
    out: 'decorativos/ornamentos/sidebar-categories-01.png',
    left: 1050,
    top: 650,
    width: 420,
    height: 320,
  },
  {
    out: 'icones/ui/social-row-01.png',
    left: 620,
    top: 890,
    width: 320,
    height: 92,
  },
  {
    out: 'icones/ui/search-bar-01.png',
    left: 1080,
    top: 165,
    width: 368,
    height: 90,
  },
];

async function ensureDir(filepath) {
  await fs.mkdir(path.dirname(filepath), { recursive: true });
}

async function run() {
  const image = sharp(SOURCE);
  const meta = await image.metadata();

  if (!meta.width || !meta.height) {
    throw new Error('Nao foi possivel ler dimensoes da imagem fonte.');
  }

  for (const crop of crops) {
    if (
      crop.left < 0 ||
      crop.top < 0 ||
      crop.left + crop.width > meta.width ||
      crop.top + crop.height > meta.height
    ) {
      throw new Error(`Crop fora dos limites: ${crop.out}`);
    }

    const destination = path.join(ROOT, crop.out);
    await ensureDir(destination);

    await sharp(SOURCE)
      .extract({
        left: crop.left,
        top: crop.top,
        width: crop.width,
        height: crop.height,
      })
      .png()
      .toFile(destination);

    console.log(`ok: ${crop.out}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
