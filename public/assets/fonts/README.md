# PDF typography

Inter Regular and Bold are the complete static font files published by the Inter
project, losslessly decompressed from WOFF2 to TTF, not Latin-only web subsets.
Licensed under the SIL Open Font License
1.1 (see OFL.txt). Complete fonts are embedded in PDFs; request text remains text,
not a raster image.

Source: https://github.com/rsms/inter/tree/353b61b9f4430d5f420d56605a6e7993e0941470/docs/font-files
Original files: Inter-Regular.woff2, Inter-Bold.woff2
Deployed files: Inter-Regular.ttf, Inter-Bold.ttf
Retrieved: 2026-09-04

Conversion uses fontTools TTFont, sets flavor to None, and saves the TTF without
changing glyphs or font naming. Full-font embedding avoids fontkit subset glyph
remapping problems; the complete fonts add approximately 260 KB after PDF compression.

The fonts support Latin (including common accented and extended Latin names),
Greek, and Cyrillic. They do not provide universal script coverage. The PDF
generator checks customer fields and offers an explicit fallback message rather
than silently replacing an unsupported name with corrupted characters.
