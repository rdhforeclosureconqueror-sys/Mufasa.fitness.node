# Engine-first visual acceptance

Build and test the renderer independently of final artwork. Use a clearly labeled test fixture, never a production placeholder. Keep the original premium artwork as a separate candidate; compare both after the engine works. No production release until visual and anatomical acceptance.

Asset contract: original SVG with viewBox, anterior/posterior metadata, stable region IDs, canonical muscle ID and anatomical side per region. Multiple paths may represent one muscle. No scripts, external resources or event attributes. Renderer owns role colors, selection, accessible labels and unknown mapping reporting. Asset replacement must not change exercise logic.

Visual gate: natural athletic proportions, organic contours, distinct front/back anatomy, readable muscle boundaries, crisp mobile rendering, original geometry, qualified anatomical review. User reference screenshot is a quality benchmark only, not a tracing source. Keep candidate artwork outside production until approved. Preview engine fixture before swapping in premium assets. Verify identical mapping behavior after replacement.
