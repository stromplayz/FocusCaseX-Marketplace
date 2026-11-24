/**
 * FocusCaseX sample plugin — Essential Diagrams (v1.2.0).
 *
 * Interactive clinical-atlas eye diagrams for the slit lamp and ophthalmoscope —
 * an EXAMINATION-ONLY tool: the engine is embedded by the Examination
 * workup (ExamDiagram sheet), never surfaced as app chrome.
 * Tap-to-select anatomical structures on the ANTERIOR SEGMENT (lids,
 * canthi, caruncle, plica, conjunctiva, sclera, limbus, cornea, iris,
 * pupil, superior/inferior puncta, canaliculi, lacrimal sac, nasolacrimal
 * duct) and the FUNDUS (disc, rim, cup, macula, fovea, arcades, vessels,
 * peripheral quadrants) — tracked separately for OD and OS, with a free-
 * text LABEL per selected structure, then the labeled findings are added
 * straight into the workup's slit-lamp / fundus note fields.
 *
 *  • Engine namespaces on window.__ED__: state (eye/tab/sub/selections/
 *    labels), ante, fundus (self-mounting stage + structure list), findings
 *    (labeled text builders), svg (the five flat-2D diagrams).
 *  • Registers ONLY its CSS, a settings pane ("Remember selections") and
 *    state persistence — no sidebar section, no ribbon, no view, no
 *    commands (FIX: the "Diagrams" sidemenu section made an examination
 *    tool look like app chrome; it lives inside the exam now).
 *  • Ships its own scoped CSS (removed on unload); selections AND labels
 *    persist via plugin data with a "Remember selections" toggle.
 *
 * Assembly (plan-integration §7): svg-inject -> state -> ante -> fundus
 * -> findings -> shell -> boot. Built by the 13-agent Essential Diagrams
 * run (3 plan + 5 SVG design + 5 function code); v1.1.0 exam-embed +
 * labels pass; v1.2.0 clinical-atlas SVG redesign (light field, thin slate
 * outlines, muted anatomical fills, stroke-none hit targets).
 */
(function (ctx) {
  "use strict";

  /* =========================== svg-inject ============================ */

  window.__ED__ = window.__ED__ || {};
  (function (ED) {
    "use strict";
    /* Flat CLINICAL ATLAS diagrams (v1.2 redesign): light tissue-neutral
       field, thin slate outlines, muted anatomical fills — the language of
       a clinical atlas page, not a cartoon. Every selectable structure is a
       [data-struct] group with role=button + <title>; fat transparent
       .ed-hit shapes widen the tap target without changing the anatomy
       (stroke="none" so hits never inherit a group outline). No <text>
       anywhere — the OS mirror (scaleX(-1) on the stage) would flip it; the
       row list beside the stage carries the names. */
    ED.svg = {};
    ED.svg.ante_surface = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="Anterior segment — surface and adnexa">
  <!-- essential-diagrams / ante-surface (S1, v1.2): open-eye external view, lids + adnexa.
       Paint order bottom→top: field, upper_lid, lower_lid, palpebral_conj strips,
       bulbar_conj lens, exposed_sclera lens (hole at limbus), cornea, ctx iris/pupil,
       limbus ring, ctx lid shadow, medial_canthus, caruncle, plica, lateral_canthus,
       lid_margin bands, tear_meniscus, lashes, ctx puncta.
       OD default: nasal/medial on viewer RIGHT. -->
  <g id="ed-root">
    <g class="ed-ctx" pointer-events="none">
      <rect x="0" y="0" width="600" height="600" fill="var(--ed-field,#eef0f4)"/>
    </g>
    <!-- upper lid: skin between the lid crease (top edge) and the upper margin -->
    <g data-struct="upper_lid" role="button" tabindex="0" aria-label="Upper Lid" class="ed-struct" fill="var(--ed-skin,#ecc9ae)" stroke="var(--ed-skinline,#a97e5f)" stroke-width="2">
      <title>Upper Lid</title>
      <path d="M86 296 C180 204 420 204 514 300 C492 208 430 138 300 132 C180 128 108 204 86 296 Z"/>
      <path class="ed-hit" d="M86 296 C180 204 420 204 514 300 C492 208 430 138 300 132 C180 128 108 204 86 296 Z" fill="transparent" stroke="none" stroke-width="18" stroke-linejoin="round" pointer-events="all"/>
    </g>
    <!-- lower lid: skin between the lower margin and the infraorbital fold -->
    <g data-struct="lower_lid" role="button" tabindex="0" aria-label="Lower Lid" class="ed-struct" fill="var(--ed-skin,#ecc9ae)" stroke="var(--ed-skinline,#a97e5f)" stroke-width="2">
      <title>Lower Lid</title>
      <path d="M86 296 C180 415 420 415 514 300 C486 404 420 470 300 474 C190 476 118 402 86 296 Z"/>
      <path class="ed-hit" d="M86 296 C180 415 420 415 514 300 C486 404 420 470 300 474 C190 476 118 402 86 296 Z" fill="transparent" stroke="none" stroke-width="18" stroke-linejoin="round" pointer-events="all"/>
    </g>
    <!-- palpebral conjunctiva: the pink lining strips just inside each margin -->
    <g data-struct="palpebral_conjunctiva" role="button" tabindex="0" aria-label="Palpebral Conjunctiva" class="ed-struct" fill="var(--ed-pconj,#f3d7cf)" stroke="none">
      <title>Palpebral Conjunctiva</title>
      <path d="M86 296 C180 204 420 204 514 300 C420 218 180 218 86 296 Z"/>
      <path d="M86 296 C180 415 420 415 514 300 C420 397 180 397 86 296 Z"/>
      <path class="ed-hit" d="M118 268 C210 222 390 222 482 268" fill="none" stroke="transparent" stroke-width="26" stroke-linecap="round" pointer-events="all"/>
      <path class="ed-hit" d="M118 330 C210 396 390 396 482 330" fill="none" stroke="transparent" stroke-width="26" stroke-linecap="round" pointer-events="all"/>
    </g>
    <!-- bulbar conjunctiva: the whole aperture lens, outermost selectable -->
    <g data-struct="bulbar_conjunctiva" role="button" tabindex="0" aria-label="Bulbar Conjunctiva" class="ed-struct" fill="var(--ed-conj,#f9f0ec)" stroke="none">
      <title>Bulbar Conjunctiva</title>
      <path d="M86 296 C180 204 420 204 514 300 C420 415 180 415 86 296 Z"/>
    </g>
    <!-- exposed sclera: inner lens with a hole at the limbus outer edge (r96) -->
    <g data-struct="exposed_sclera" role="button" tabindex="0" aria-label="Exposed Sclera" class="ed-struct" fill="var(--ed-sclera,#f9fafb)" stroke="none">
      <title>Exposed Sclera</title>
      <path fill-rule="evenodd" d="M86 296 C180 204 420 204 514 300 C420 415 180 415 86 296 Z M300 204 A96 96 0 1 0 300 396 A96 96 0 1 0 300 204 Z"/>
    </g>
    <!-- cornea: the clear disc over the iris plane -->
    <g data-struct="cornea" role="button" tabindex="0" aria-label="Cornea" class="ed-struct" fill="var(--ed-cornea,#e7eef3)" stroke="var(--ed-line,#46525e)" stroke-width="2" data-fill="on">
      <title>Cornea</title>
      <circle cx="300" cy="300" r="80"/>
      <circle class="ed-hit" cx="300" cy="300" r="80" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- context: iris + pupil seen through the cornea (never selectable here) -->
    <g class="ed-ctx" pointer-events="none">
      <circle cx="300" cy="300" r="62" fill="var(--ed-iris,#5f7d99)"/>
      <circle cx="300" cy="300" r="56" fill="none" stroke="var(--ed-iris-2,#4a6478)" stroke-width="2" opacity=".7"/>
      <circle cx="300" cy="300" r="21" fill="var(--ed-pupil,#1d232a)"/>
    </g>
    <!-- limbus: the ring band r80→96 -->
    <g data-struct="limbus" role="button" tabindex="0" aria-label="Limbus" class="ed-struct" fill="var(--ed-limbus,#7e93a8)">
      <title>Limbus</title>
      <path fill-rule="evenodd" d="M300 204 A96 96 0 1 0 300 396 A96 96 0 1 0 300 204 Z M300 222 A78 78 0 1 1 300 378 A78 78 0 1 1 300 222 Z"/>
      <circle class="ed-hit" cx="300" cy="300" r="88" fill="none" stroke="transparent" stroke-width="22" stroke-linecap="round" pointer-events="all"/>
    </g>
    <!-- context: the upper-lid shadow arc across the top of the cornea -->
    <g class="ed-ctx" pointer-events="none">
      <ellipse cx="300" cy="222" rx="74" ry="11" fill="rgba(70,82,94,.14)"/>
    </g>
    <!-- medial canthus: the tear-lake corner wedge (nasal, viewer right) -->
    <g data-struct="medial_canthus" role="button" tabindex="0" aria-label="Medial Canthus" class="ed-struct" fill="var(--ed-pconj,#f3d7cf)" stroke="var(--ed-skinline,#a97e5f)" stroke-width="1.5">
      <title>Medial Canthus</title>
      <path d="M514 300 C500 286 490 278 480 274 L480 328 C490 323 500 314 514 300 Z"/>
      <circle class="ed-hit" cx="502" cy="300" r="17" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- caruncle: the pink body inside the tear lake -->
    <g data-struct="caruncle" role="button" tabindex="0" aria-label="Caruncle" class="ed-struct" fill="var(--ed-caruncle,#e5a08f)" stroke="var(--ed-skinline,#a97e5f)" stroke-width="1.5">
      <title>Caruncle</title>
      <path d="M486 292 C493 285 502 287 506 294 C510 301 508 310 500 313 C492 316 485 311 484 303 C484 298 484 295 486 292 Z"/>
      <circle class="ed-hit" cx="496" cy="299" r="15" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- plica semilunaris: the crescent fold just temporal to the caruncle -->
    <g data-struct="plica_semilunaris" role="button" tabindex="0" aria-label="Plica Semilunaris" class="ed-struct" fill="var(--ed-plica,#f0cfc4)" stroke="var(--ed-skinline,#a97e5f)" stroke-width="1.5">
      <title>Plica Semilunaris</title>
      <path d="M468 276 C478 292 478 310 468 326 C463 310 463 292 468 276 Z"/>
      <ellipse class="ed-hit" cx="470" cy="300" rx="12" ry="26" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- lateral canthus: the temporal corner wedge (viewer left) -->
    <g data-struct="lateral_canthus" role="button" tabindex="0" aria-label="Lateral Canthus" class="ed-struct" fill="var(--ed-skin-2,#e0b49a)" stroke="var(--ed-skinline,#a97e5f)" stroke-width="1.5">
      <title>Lateral Canthus</title>
      <path d="M86 296 C98 287 106 281 116 277 L116 317 C106 312 98 305 86 296 Z"/>
      <circle class="ed-hit" cx="98" cy="297" r="15" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- lid margins: the muco-cutaneous junction strips on both lids -->
    <g data-struct="lid_margin" role="button" tabindex="0" aria-label="Lid Margin" class="ed-struct" fill="var(--ed-marginline,#b5886b)" stroke="none">
      <title>Lid Margin</title>
      <path d="M86 296 C180 188 420 188 514 300 C420 204 180 204 86 296 Z"/>
      <path d="M86 296 C180 415 420 415 514 300 C420 433 180 433 86 296 Z"/>
      <path class="ed-hit" d="M118 262 C210 214 390 214 482 262" fill="none" stroke="transparent" stroke-width="24" stroke-linecap="round" pointer-events="all"/>
      <path class="ed-hit" d="M118 338 C210 404 390 404 482 338" fill="none" stroke="transparent" stroke-width="24" stroke-linecap="round" pointer-events="all"/>
    </g>
    <!-- tear meniscus: the bright strip riding the inner lower margin -->
    <g data-struct="tear_meniscus" role="button" tabindex="0" aria-label="Tear Meniscus" class="ed-struct" fill="var(--ed-tear,#fdfefe)" stroke="var(--ed-line,#46525e)" stroke-width="1.25" data-fill="on">
      <title>Tear Meniscus</title>
      <path d="M86 296 C180 415 420 415 514 300 C420 407 180 407 86 296 Z"/>
      <path class="ed-hit" d="M118 336 C210 400 390 400 482 336" fill="none" stroke="transparent" stroke-width="22" stroke-linecap="round" pointer-events="all"/>
    </g>
    <!-- lashes: upper fringe curving up-out, shorter lower fringe -->
    <g data-struct="lashes" role="button" tabindex="0" aria-label="Lashes" class="ed-struct" fill="none" stroke="var(--ed-lash,#46403a)" stroke-width="2.75" stroke-linecap="round">
      <title>Lashes</title>
      <path d="M116 288 Q110 270 100 261"/>
      <path d="M143 270 Q136 250 125 243"/>
      <path d="M172 254 Q166 233 154 227"/>
      <path d="M203 243 Q198 221 186 216"/>
      <path d="M236 235 Q232 213 220 209"/>
      <path d="M270 230 Q267 208 256 205"/>
      <path d="M304 228 Q303 206 292 204"/>
      <path d="M338 230 Q339 208 350 205"/>
      <path d="M372 235 Q375 213 387 209"/>
      <path d="M405 243 Q410 221 422 216"/>
      <path d="M436 254 Q443 233 455 227"/>
      <path d="M465 270 Q473 250 484 243"/>
      <path d="M150 336 Q144 352 136 360"/>
      <path d="M186 358 Q180 373 172 380"/>
      <path d="M224 372 Q219 386 211 392"/>
      <path d="M262 380 Q258 394 251 399"/>
      <path d="M300 383 Q297 397 291 402"/>
      <path d="M338 380 Q341 394 348 399"/>
      <path d="M376 372 Q381 386 389 392"/>
      <path d="M414 358 Q420 373 428 380"/>
      <path class="ed-hit" d="M112 280 C210 226 390 226 488 280" fill="none" stroke="transparent" stroke-width="26" stroke-linecap="round" pointer-events="all"/>
      <path class="ed-hit" d="M142 352 C230 402 370 402 458 352" fill="none" stroke="transparent" stroke-width="24" stroke-linecap="round" pointer-events="all"/>
    </g>
    <!-- context: puncta micro-dots on the margins (lacrimal view is their home) -->
    <g class="ed-ctx" pointer-events="none">
      <circle cx="452" cy="228" r="4" fill="var(--ed-line,#46525e)"/>
      <circle cx="452" cy="384" r="4" fill="var(--ed-line,#46525e)"/>
    </g>
  </g>
</svg>`;
    ED.svg.ante_cornea = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="Anterior segment — cornea, iris and pupil">
  <!-- essential-diagrams / ante-cornea (S2, v1.2): magnified cornea / iris / pupil.
       Paint order: field, sclera ring + conj vessels (ctx), cornea annulus,
       iris annulus, pupil, limbus ring, specular (ctx), hits. -->
  <g id="ed-root">
    <g class="ed-ctx" pointer-events="none">
      <rect x="0" y="0" width="600" height="600" fill="var(--ed-field,#eef0f4)"/>
      <circle cx="300" cy="300" r="272" fill="var(--ed-sclera,#f9fafb)"/>
      <path d="M96 214 C130 196 168 188 204 190" fill="none" stroke="var(--ed-vessel2,#d98a7a)" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
      <path d="M84 330 C118 342 152 348 188 346" fill="none" stroke="var(--ed-vessel2,#d98a7a)" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
      <path d="M504 386 C472 402 436 410 400 408" fill="none" stroke="var(--ed-vessel2,#d98a7a)" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
      <path d="M516 240 C484 226 450 220 416 222" fill="none" stroke="var(--ed-vessel2,#d98a7a)" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
    </g>
    <!-- cornea: the clear annulus between limbus and iris root -->
    <g data-struct="cornea" role="button" tabindex="0" aria-label="Cornea" class="ed-struct" fill="var(--ed-cornea,#dfe9f1)" stroke="none" data-fill="on">
      <title>Cornea</title>
      <path fill-rule="evenodd" d="M300 92 A208 208 0 1 0 300 508 A208 208 0 1 0 300 92 Z M300 132 A168 168 0 1 1 300 468 A168 168 0 1 1 300 132 Z"/>
      <path class="ed-hit" fill-rule="evenodd" d="M300 92 A208 208 0 1 0 300 508 A208 208 0 1 0 300 92 Z M300 132 A168 168 0 1 1 300 468 A168 168 0 1 1 300 132 Z" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- iris: the annulus with crypts and collarette -->
    <g data-struct="iris" role="button" tabindex="0" aria-label="Iris" class="ed-struct" fill="var(--ed-iris,#5f7d99)" stroke="none" data-fill="on">
      <title>Iris</title>
      <path fill-rule="evenodd" d="M300 132 A168 168 0 1 0 300 468 A168 168 0 1 0 300 132 Z M300 234 A66 66 0 1 1 300 366 A66 66 0 1 1 300 234 Z"/>
      <g pointer-events="none">
        <circle cx="300" cy="300" r="82" fill="none" stroke="var(--ed-iris-2,#4a6478)" stroke-width="2" opacity=".75"/>
        <path d="M300 218 L300 258" stroke="var(--ed-iris-2,#4a6478)" stroke-width="1.5" opacity=".6"/>
        <path d="M359 241 L333 268" stroke="var(--ed-iris-2,#4a6478)" stroke-width="1.5" opacity=".6"/>
        <path d="M382 300 L342 300" stroke="var(--ed-iris-2,#4a6478)" stroke-width="1.5" opacity=".6"/>
        <path d="M359 359 L333 332" stroke="var(--ed-iris-2,#4a6478)" stroke-width="1.5" opacity=".6"/>
        <path d="M300 382 L300 342" stroke="var(--ed-iris-2,#4a6478)" stroke-width="1.5" opacity=".6"/>
        <path d="M241 359 L267 332" stroke="var(--ed-iris-2,#4a6478)" stroke-width="1.5" opacity=".6"/>
        <path d="M218 300 L258 300" stroke="var(--ed-iris-2,#4a6478)" stroke-width="1.5" opacity=".6"/>
        <path d="M241 241 L267 268" stroke="var(--ed-iris-2,#4a6478)" stroke-width="1.5" opacity=".6"/>
      </g>
      <path class="ed-hit" fill-rule="evenodd" d="M300 132 A168 168 0 1 0 300 468 A168 168 0 1 0 300 132 Z M300 234 A66 66 0 1 1 300 366 A66 66 0 1 1 300 234 Z" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- pupil -->
    <g data-struct="pupil" role="button" tabindex="0" aria-label="Pupil" class="ed-struct" fill="var(--ed-pupil,#1d232a)" data-fill="on">
      <title>Pupil</title>
      <circle cx="300" cy="300" r="60"/>
      <circle class="ed-hit" cx="300" cy="300" r="66" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- limbus: the transition ring -->
    <g data-struct="limbus" role="button" tabindex="0" aria-label="Limbus" class="ed-struct" fill="var(--ed-limbus,#7e93a8)">
      <title>Limbus</title>
      <path fill-rule="evenodd" d="M300 64 A236 236 0 1 0 300 536 A236 236 0 1 0 300 64 Z M300 92 A208 208 0 1 1 300 508 A208 208 0 1 1 300 92 Z"/>
      <circle class="ed-hit" cx="300" cy="300" r="222" fill="none" stroke="transparent" stroke-width="36" stroke-linecap="round" pointer-events="all"/>
    </g>
    <!-- context: specular reflection off the tear film -->
    <g class="ed-ctx" pointer-events="none">
      <path d="M176 208 A170 170 0 0 1 244 148" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" opacity=".65"/>
    </g>
  </g>
</svg>`;
    ED.svg.ante_lacrimal = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="Lacrimal drainage — puncta, canaliculi, sac and nasolacrimal duct">
  <!-- essential-diagrams / ante-lacrimal (S3, v1.2): the drainage pathway.
       Left: external-eye reference with the two puncta ON its margins.
       Flow: punctum → canaliculus → common canaliculus → sac → duct →
       inferior meatus. Context flow arrows + turbinate hint, no text. -->
  <g id="ed-root">
    <g class="ed-ctx" pointer-events="none">
      <rect x="0" y="0" width="600" height="600" fill="var(--ed-field,#eef0f4)"/>
    </g>
    <!-- reference eye (context): upper lid, lower lid, aperture, iris -->
    <g class="ed-ctx" pointer-events="none">
      <path d="M42 182 C96 96 208 96 268 182 C208 138 96 138 42 182 Z" fill="var(--ed-skin,#ecc9ae)" stroke="var(--ed-skinline,#a97e5f)" stroke-width="2"/>
      <path d="M42 182 C96 270 208 270 268 182 C208 232 96 232 42 182 Z" fill="var(--ed-skin,#ecc9ae)" stroke="var(--ed-skinline,#a97e5f)" stroke-width="2"/>
      <path d="M42 182 C96 138 208 138 268 182 C208 232 96 232 42 182 Z" fill="var(--ed-sclera,#f9fafb)"/>
      <circle cx="128" cy="184" r="27" fill="var(--ed-iris,#5f7d99)"/>
      <circle cx="128" cy="184" r="10" fill="var(--ed-pupil,#1d232a)"/>
    </g>
    <!-- superior punctum: on the upper margin, ~6 mm temporal of the canthus -->
    <g data-struct="superior_punctum" role="button" tabindex="0" aria-label="Superior Punctum" class="ed-struct" fill="var(--ed-marginline,#b5886b)" stroke="var(--ed-line,#46525e)" stroke-width="1.5" data-fill="on">
      <title>Superior Punctum</title>
      <ellipse cx="234" cy="152" rx="8.5" ry="6.5"/>
      <circle class="ed-hit" cx="234" cy="152" r="15" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- inferior punctum -->
    <g data-struct="inferior_punctum" role="button" tabindex="0" aria-label="Inferior Punctum" class="ed-struct" fill="var(--ed-marginline,#b5886b)" stroke="var(--ed-line,#46525e)" stroke-width="1.5" data-fill="on">
      <title>Inferior Punctum</title>
      <ellipse cx="232" cy="212" rx="8.5" ry="6.5"/>
      <circle class="ed-hit" cx="232" cy="212" r="15" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- superior canaliculus: ampulla then the long medial run down -->
    <g data-struct="superior_canaliculus" role="button" tabindex="0" aria-label="Superior Canaliculus" class="ed-struct" fill="none" stroke="none" data-fill="on">
      <title>Superior Canaliculus</title>
      <path d="M243 154 C300 154 348 176 382 222" fill="none" stroke="var(--ed-skinline,#a97e5f)" stroke-width="15" stroke-linecap="round"/>
      <path d="M243 154 C300 154 348 176 382 222" fill="none" stroke="var(--ed-canal,#e3c3b0)" stroke-width="10" stroke-linecap="round"/>
      <path class="ed-hit" d="M243 154 C300 154 348 176 382 222" fill="none" stroke="transparent" stroke-width="30" stroke-linecap="round" pointer-events="all"/>
    </g>
    <!-- inferior canaliculus -->
    <g data-struct="inferior_canaliculus" role="button" tabindex="0" aria-label="Inferior Canaliculus" class="ed-struct" fill="none" stroke="none" data-fill="on">
      <title>Inferior Canaliculus</title>
      <path d="M241 212 C298 214 340 232 372 268" fill="none" stroke="var(--ed-skinline,#a97e5f)" stroke-width="15" stroke-linecap="round"/>
      <path d="M241 212 C298 214 340 232 372 268" fill="none" stroke="var(--ed-canal,#e3c3b0)" stroke-width="10" stroke-linecap="round"/>
      <path class="ed-hit" d="M241 212 C298 214 340 232 372 268" fill="none" stroke="transparent" stroke-width="30" stroke-linecap="round" pointer-events="all"/>
    </g>
    <!-- common canaliculus: the short internal trunk before the sac -->
    <g data-struct="common_canaliculus" role="button" tabindex="0" aria-label="Common Canaliculus" class="ed-struct" fill="none" stroke="none" data-fill="on">
      <title>Common Canaliculus</title>
      <path d="M377 245 C390 254 398 262 404 272" fill="none" stroke="var(--ed-skinline,#a97e5f)" stroke-width="13" stroke-linecap="round"/>
      <path d="M377 245 C390 254 398 262 404 272" fill="none" stroke="var(--ed-canal,#e3c3b0)" stroke-width="8.5" stroke-linecap="round"/>
      <path class="ed-hit" d="M377 245 C390 254 398 262 404 272" fill="none" stroke="transparent" stroke-width="30" stroke-linecap="round" pointer-events="all"/>
    </g>
    <!-- lacrimal sac: the fossa reservoir -->
    <g data-struct="lacrimal_sac" role="button" tabindex="0" aria-label="Lacrimal Sac" class="ed-struct" fill="var(--ed-pconj,#f3d7cf)" stroke="var(--ed-line,#46525e)" stroke-width="2" data-fill="on">
      <title>Lacrimal Sac</title>
      <ellipse cx="412" cy="330" rx="30" ry="60"/>
      <circle class="ed-hit" cx="412" cy="330" r="48" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- nasolacrimal duct: descending into the inferior meatus -->
    <g data-struct="nasolacrimal_duct" role="button" tabindex="0" aria-label="Nasolacrimal Duct" class="ed-struct" fill="none" stroke="none" data-fill="on">
      <title>Nasolacrimal Duct</title>
      <path d="M414 388 C420 442 426 480 436 516" fill="none" stroke="var(--ed-skinline,#a97e5f)" stroke-width="22" stroke-linecap="round"/>
      <path d="M414 388 C420 442 426 480 436 516" fill="none" stroke="var(--ed-canal,#e3c3b0)" stroke-width="15" stroke-linecap="round"/>
      <path class="ed-hit" d="M414 388 C420 442 426 480 436 516" fill="none" stroke="transparent" stroke-width="36" stroke-linecap="round" pointer-events="all"/>
    </g>
    <!-- context: inferior-meatus flare, turbinate hint, flow arrows -->
    <g class="ed-ctx" pointer-events="none" fill="none">
      <path d="M420 522 C414 548 420 566 438 578" stroke="var(--ed-line,#46525e)" stroke-width="2" stroke-dasharray="4 5"/>
      <path d="M366 556 C424 542 480 550 520 582" stroke="var(--ed-skinline,#a97e5f)" stroke-width="3.5" opacity=".85"/>
      <path d="M416 448 L406 455 M426 448 L416 455" stroke="var(--ed-line,#46525e)" stroke-width="2"/>
      <path d="M424 488 L414 495 M434 488 L424 495" stroke="var(--ed-line,#46525e)" stroke-width="2"/>
      <path d="M292 158 L308 150 M292 158 L306 165" stroke="var(--ed-dim,#8a94a2)" stroke-width="2"/>
      <path d="M290 220 L306 214 M290 220 L304 228" stroke="var(--ed-dim,#8a94a2)" stroke-width="2"/>
    </g>
  </g>
</svg>`;
    ED.svg.fundus_pole = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="Fundus — posterior pole">
  <!-- essential-diagrams / fundus-pole (S4, v1.2): ophthalmoscopic posterior pole.
       Circular field; disc nasal (viewer RIGHT for OD), macula temporal (LEFT).
       Paint order: field circle, vessels (thin branches off the arcades),
       arcades, disc stack, macula/fovea. Everything clips to the field. -->
  <defs>
    <clipPath id="ed-pole-clip"><circle cx="300" cy="300" r="256"/></clipPath>
  </defs>
  <g id="ed-root">
    <g class="ed-ctx" pointer-events="none">
      <rect x="0" y="0" width="600" height="600" fill="var(--ed-field,#eef0f4)"/>
    </g>
    <g clip-path="url(#ed-pole-clip)">
      <circle cx="300" cy="300" r="256" fill="var(--ed-fundus,#eccaa6)"/>
      <circle cx="300" cy="300" r="244" fill="none" stroke="var(--ed-fundus-2,#dfb28a)" stroke-width="24" opacity=".5"/>
      <!-- retinal vessels: thin branches forking off the arcades -->
      <g data-struct="retinal_vessels" role="button" tabindex="0" aria-label="Retinal Vessels" class="ed-struct" fill="none" stroke="var(--ed-vessel2,#c2765f)" stroke-width="2.5" stroke-linecap="round" data-fill="on">
        <title>Retinal Vessels</title>
        <path d="M320 200 C308 176 292 158 268 148"/>
        <path d="M268 148 C258 132 246 122 228 118"/>
        <path d="M262 200 C252 182 238 170 218 166"/>
        <path d="M218 166 C204 152 188 146 168 146"/>
        <path d="M186 214 C174 210 160 210 146 214"/>
        <path d="M320 402 C308 426 292 444 268 454"/>
        <path d="M268 454 C258 470 246 480 228 484"/>
        <path d="M262 402 C252 420 238 432 218 436"/>
        <path d="M218 436 C204 450 188 456 168 456"/>
        <path d="M186 388 C174 392 160 392 146 388"/>
        <path d="M470 232 C486 218 506 208 528 204"/>
        <path d="M470 330 C486 344 506 354 528 358"/>
        <path d="M508 214 C520 200 532 192 548 188"/>
        <path d="M508 348 C520 362 532 370 548 374"/>
        <path class="ed-hit" d="M320 200 C308 176 292 158 268 148 M320 402 C308 426 292 444 268 454" fill="none" stroke="transparent" stroke-width="22" stroke-linecap="round" pointer-events="all"/>
        <path class="ed-hit" d="M262 200 C252 182 238 170 218 166 M262 402 C252 420 238 432 218 436" fill="none" stroke="transparent" stroke-width="22" stroke-linecap="round" pointer-events="all"/>
        <path class="ed-hit" d="M470 232 C486 218 506 208 528 204 M470 330 C486 344 506 354 528 358" fill="none" stroke="transparent" stroke-width="22" stroke-linecap="round" pointer-events="all"/>
      </g>
      <!-- vascular arcades: the four main trunks off the disc, bowing around the macula -->
      <g data-struct="arcade_superior_temporal" role="button" tabindex="0" aria-label="Superior Temporal Arcade" class="ed-struct" fill="none" stroke="var(--ed-vessel,#a34d3f)" stroke-width="6.5" stroke-linecap="round" data-fill="on">
        <title>Superior Temporal Arcade</title>
        <path d="M390 244 C330 196 240 186 152 220"/>
        <path class="ed-hit" d="M390 244 C330 196 240 186 152 220" fill="none" stroke="transparent" stroke-width="30" stroke-linecap="round" pointer-events="all"/>
      </g>
      <g data-struct="arcade_inferior_temporal" role="button" tabindex="0" aria-label="Inferior Temporal Arcade" class="ed-struct" fill="none" stroke="var(--ed-vessel,#a34d3f)" stroke-width="6.5" stroke-linecap="round" data-fill="on">
        <title>Inferior Temporal Arcade</title>
        <path d="M390 320 C330 366 240 376 152 342"/>
        <path class="ed-hit" d="M390 320 C330 366 240 376 152 342" fill="none" stroke="transparent" stroke-width="30" stroke-linecap="round" pointer-events="all"/>
      </g>
      <g data-struct="arcade_superior_nasal" role="button" tabindex="0" aria-label="Superior Nasal Arcade" class="ed-struct" fill="none" stroke="var(--ed-vessel,#a34d3f)" stroke-width="6.5" stroke-linecap="round" data-fill="on">
        <title>Superior Nasal Arcade</title>
        <path d="M440 246 C482 214 524 196 556 192"/>
        <path class="ed-hit" d="M440 246 C482 214 524 196 556 192" fill="none" stroke="transparent" stroke-width="30" stroke-linecap="round" pointer-events="all"/>
      </g>
      <g data-struct="arcade_inferior_nasal" role="button" tabindex="0" aria-label="Inferior Nasal Arcade" class="ed-struct" fill="none" stroke="var(--ed-vessel,#a34d3f)" stroke-width="6.5" stroke-linecap="round" data-fill="on">
        <title>Inferior Nasal Arcade</title>
        <path d="M440 318 C482 350 524 368 556 372"/>
        <path class="ed-hit" d="M440 318 C482 350 524 368 556 372" fill="none" stroke="transparent" stroke-width="30" stroke-linecap="round" pointer-events="all"/>
      </g>
      <!-- macula halo, then fovea -->
      <g data-struct="macula" role="button" tabindex="0" aria-label="Macula" class="ed-struct" fill="none" stroke="var(--ed-macula,#cf9257)" stroke-width="9" data-fill="on">
        <title>Macula</title>
        <ellipse cx="182" cy="281" rx="44" ry="38"/>
        <ellipse class="ed-hit" cx="182" cy="281" rx="56" ry="50" fill="transparent" stroke="none" stroke-width="14" pointer-events="all"/>
      </g>
      <g data-struct="fovea" role="button" tabindex="0" aria-label="Fovea" class="ed-struct" fill="var(--ed-fovea,#b96a3f)" data-fill="on">
        <title>Fovea</title>
        <circle cx="182" cy="281" r="14"/>
        <circle cx="182" cy="281" r="5" fill="var(--ed-fundus,#eccaa6)" opacity=".9"/>
        <circle class="ed-hit" cx="182" cy="281" r="22" fill="transparent" stroke="none" pointer-events="all"/>
      </g>
      <!-- disc stack: disc base, rim annulus, cup -->
      <g data-struct="optic_disc" role="button" tabindex="0" aria-label="Optic Disc" class="ed-struct" fill="var(--ed-disc,#ecd7bc)" stroke="var(--ed-disc-2,#caa268)" stroke-width="2" data-fill="on">
        <title>Optic Disc</title>
        <circle cx="412" cy="281" r="54"/>
        <circle class="ed-hit" cx="412" cy="281" r="54" fill="transparent" stroke="none" pointer-events="all"/>
      </g>
      <g data-struct="neuroretinal_rim" role="button" tabindex="0" aria-label="Neuroretinal Rim" class="ed-struct" fill="var(--ed-rim,#dcbc8e)" data-fill="on">
        <title>Neuroretinal Rim</title>
        <path fill-rule="evenodd" d="M412 227 A54 54 0 1 0 412 335 A54 54 0 1 0 412 227 Z M412 255 A26 26 0 1 1 412 307 A26 26 0 1 1 412 255 Z"/>
        <path class="ed-hit" fill-rule="evenodd" d="M412 227 A54 54 0 1 0 412 335 A54 54 0 1 0 412 227 Z M412 255 A26 26 0 1 1 412 307 A26 26 0 1 1 412 255 Z" fill="transparent" stroke="none" pointer-events="all"/>
      </g>
      <g data-struct="optic_cup" role="button" tabindex="0" aria-label="Optic Cup" class="ed-struct" fill="var(--ed-cup,#f4ecdd)" data-fill="on">
        <title>Optic Cup</title>
        <circle cx="412" cy="281" r="26"/>
        <circle class="ed-hit" cx="412" cy="281" r="26" fill="transparent" stroke="none" pointer-events="all"/>
      </g>
    </g>
    <!-- context: the ophthalmoscope field edge -->
    <g class="ed-ctx" pointer-events="none">
      <circle cx="300" cy="300" r="256" fill="none" stroke="var(--ed-line,#46525e)" stroke-width="2" opacity=".35"/>
    </g>
  </g>
</svg>`;
    ED.svg.fundus_periph = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="Fundus — retinal periphery">
  <!-- essential-diagrams / fundus-periph (S5, v1.2): flattened retina chart.
       Central posterior pole (context) + four peripheral zones (selectable)
       divided on the diagonals: superior top, inferior bottom, nasal RIGHT
       (OD), temporal LEFT. Ora serrata dashed just inside the chart edge. -->
  <defs>
    <clipPath id="ed-periph-clip"><ellipse cx="300" cy="300" rx="250" ry="190"/></clipPath>
  </defs>
  <g id="ed-root">
    <g class="ed-ctx" pointer-events="none">
      <rect x="0" y="0" width="600" height="600" fill="var(--ed-field,#eef0f4)"/>
    </g>
    <!-- peripheral zones (selectable), clipped to the chart ellipse -->
    <g clip-path="url(#ed-periph-clip)">
      <g data-struct="periph_retina_superior" role="button" tabindex="0" aria-label="Peripheral Retina (Superior)" class="ed-struct" fill="var(--ed-fundus,#eccaa6)" stroke="var(--ed-fundus-2,#dfb28a)" stroke-width="2" data-fill="on">
        <title>Peripheral Retina (Superior)</title>
        <path d="M477 166 A250 190 0 0 0 123 166 L222 222 A110 110 0 0 1 378 222 Z"/>
        <path class="ed-hit" d="M477 166 A250 190 0 0 0 123 166 L222 222 A110 110 0 0 1 378 222 Z" fill="transparent" stroke="none" pointer-events="all"/>
      </g>
      <g data-struct="periph_retina_inferior" role="button" tabindex="0" aria-label="Peripheral Retina (Inferior)" class="ed-struct" fill="var(--ed-fundus,#eccaa6)" stroke="var(--ed-fundus-2,#dfb28a)" stroke-width="2" data-fill="on">
        <title>Peripheral Retina (Inferior)</title>
        <path d="M123 434 A250 190 0 0 0 477 434 L378 378 A110 110 0 0 1 222 378 Z"/>
        <path class="ed-hit" d="M123 434 A250 190 0 0 0 477 434 L378 378 A110 110 0 0 1 222 378 Z" fill="transparent" stroke="none" pointer-events="all"/>
      </g>
      <g data-struct="periph_retina_nasal" role="button" tabindex="0" aria-label="Peripheral Retina (Nasal)" class="ed-struct" fill="var(--ed-fundus,#eccaa6)" stroke="var(--ed-fundus-2,#dfb28a)" stroke-width="2" data-fill="on">
        <title>Peripheral Retina (Nasal)</title>
        <path d="M477 166 A250 190 0 0 1 477 434 L378 378 A110 110 0 0 0 378 222 Z"/>
        <path class="ed-hit" d="M477 166 A250 190 0 0 1 477 434 L378 378 A110 110 0 0 0 378 222 Z" fill="transparent" stroke="none" pointer-events="all"/>
      </g>
      <g data-struct="periph_retina_temporal" role="button" tabindex="0" aria-label="Peripheral Retina (Temporal)" class="ed-struct" fill="var(--ed-fundus,#eccaa6)" stroke="var(--ed-fundus-2,#dfb28a)" stroke-width="2" data-fill="on">
        <title>Peripheral Retina (Temporal)</title>
        <path d="M123 434 A250 190 0 0 1 123 166 L222 222 A110 110 0 0 0 222 378 Z"/>
        <path class="ed-hit" d="M123 434 A250 190 0 0 1 123 166 L222 222 A110 110 0 0 0 222 378 Z" fill="transparent" stroke="none" pointer-events="all"/>
      </g>
      <!-- context: faint vessel hints radiating into the periphery -->
      <g class="ed-ctx" pointer-events="none" fill="none" stroke="var(--ed-vessel2,#c2765f)" stroke-width="2.5" stroke-linecap="round" opacity=".8">
        <path d="M356 236 C400 200 440 176 486 162"/>
        <path d="M356 364 C400 400 440 424 486 438"/>
        <path d="M244 236 C204 202 170 180 128 168"/>
        <path d="M244 364 C204 398 170 420 128 432"/>
        <path d="M378 300 L470 300"/>
        <path d="M222 300 L130 300"/>
      </g>
    </g>
    <!-- central posterior pole (context): mini disc stack + macula -->
    <g class="ed-ctx" pointer-events="none">
      <circle cx="300" cy="300" r="110" fill="var(--ed-fundus,#eccaa6)" stroke="var(--ed-fundus-2,#dfb28a)" stroke-width="2"/>
      <circle cx="346" cy="284" r="22" fill="var(--ed-disc,#ecd7bc)" stroke="var(--ed-disc-2,#caa268)" stroke-width="1.5"/>
      <circle cx="346" cy="284" r="9" fill="var(--ed-cup,#f4ecdd)"/>
      <ellipse cx="254" cy="308" rx="19" ry="16" fill="none" stroke="var(--ed-macula,#cf9257)" stroke-width="4"/>
      <circle cx="254" cy="308" r="6" fill="var(--ed-fovea,#b96a3f)"/>
      <path d="M330 266 C312 252 296 246 276 248" fill="none" stroke="var(--ed-vessel,#a34d3f)" stroke-width="3" stroke-linecap="round"/>
      <path d="M330 302 C312 316 296 322 276 320" fill="none" stroke="var(--ed-vessel,#a34d3f)" stroke-width="3" stroke-linecap="round"/>
      <path d="M366 268 C388 258 404 256 424 260" fill="none" stroke="var(--ed-vessel,#a34d3f)" stroke-width="3" stroke-linecap="round"/>
      <path d="M366 300 C388 310 404 312 424 308" fill="none" stroke="var(--ed-vessel,#a34d3f)" stroke-width="3" stroke-linecap="round"/>
    </g>
    <!-- context: ora serrata (dashed) + chart edge -->
    <g class="ed-ctx" pointer-events="none" fill="none">
      <ellipse cx="300" cy="300" rx="228" ry="170" stroke="var(--ed-dim,#8a94a2)" stroke-width="2" stroke-dasharray="3 7" opacity=".85"/>
      <ellipse cx="300" cy="300" rx="250" ry="190" stroke="var(--ed-line,#46525e)" stroke-width="2" opacity=".45"/>
    </g>
  </g>
</svg>`;
  })(window.__ED__);

  /* ------------------------- ed-state.js ------------------------- */
window.__ED__ = window.__ED__ || {};
(function (ED) {
  "use strict";

  // ed-state.js (C1) — single source of truth for eye/tab/sub/selection; ES5 only (SPEC §3, plan-integration §1/§3/§7).

  var ANTE_IDS = ["bulbar_conjunctiva", "exposed_sclera", "cornea", "limbus", "medial_canthus", "lateral_canthus",
    "plica_semilunaris", "caruncle", "palpebral_conjunctiva", "upper_lid", "lower_lid", "lid_margin", "tear_meniscus",
    "lashes", "iris", "pupil", "superior_punctum", "inferior_punctum", "superior_canaliculus", "inferior_canaliculus",
    "common_canaliculus", "lacrimal_sac", "nasolacrimal_duct"];
  var FUNDUS_IDS = ["retinal_vessels", "arcade_superior_temporal", "arcade_inferior_temporal", "arcade_superior_nasal",
    "arcade_inferior_nasal", "macula", "fovea", "optic_disc", "neuroretinal_rim", "optic_cup", "periph_retina_superior",
    "periph_retina_inferior", "periph_retina_nasal", "periph_retina_temporal"];
  var LABELS = {
    bulbar_conjunctiva: "Bulbar Conjunctiva", exposed_sclera: "Exposed Sclera", cornea: "Cornea", limbus: "Limbus",
    medial_canthus: "Medial Canthus", lateral_canthus: "Lateral Canthus", plica_semilunaris: "Plica Semilunaris",
    caruncle: "Caruncle", palpebral_conjunctiva: "Palpebral Conjunctiva", upper_lid: "Upper Lid", lower_lid: "Lower Lid",
    lid_margin: "Lid Margin", tear_meniscus: "Tear Meniscus", lashes: "Lashes", iris: "Iris", pupil: "Pupil",
    superior_punctum: "Superior Punctum", inferior_punctum: "Inferior Punctum", superior_canaliculus: "Superior Canaliculus",
    inferior_canaliculus: "Inferior Canaliculus", common_canaliculus: "Common Canaliculus", lacrimal_sac: "Lacrimal Sac",
    nasolacrimal_duct: "Nasolacrimal Duct", retinal_vessels: "Retinal Vessels",
    arcade_superior_temporal: "Superior Temporal Arcade", arcade_inferior_temporal: "Inferior Temporal Arcade",
    arcade_superior_nasal: "Superior Nasal Arcade", arcade_inferior_nasal: "Inferior Nasal Arcade",
    macula: "Macula", fovea: "Fovea", optic_disc: "Optic Disc", neuroretinal_rim: "Neuroretinal Rim",
    optic_cup: "Optic Cup", periph_retina_superior: "Peripheral Retina (Superior)",
    periph_retina_inferior: "Peripheral Retina (Inferior)", periph_retina_nasal: "Peripheral Retina (Nasal)",
    periph_retina_temporal: "Peripheral Retina (Temporal)"
  };

  var STRUCT_ORDER = ANTE_IDS.concat(FUNDUS_IDS);
  var STRUCTS = {};
  var SUBS = { ante: ["surface", "cornea", "lacrimal"], fundus: ["pole", "periph"] };
  var DEFAULT_SUB = { ante: "surface", fundus: "pole" };

  (function () { // registry build: first ANTE_IDS.length ids are anterior, the rest fundus
    var i, id;
    for (i = 0; i < STRUCT_ORDER.length; i++) { id = STRUCT_ORDER[i]; STRUCTS[id] = { id: id, label: LABELS[id] || id, family: i < ANTE_IDS.length ? "ante" : "fundus" }; }
  }());

  // Runtime state — S never escapes the module; every getter returns fresh copies.
  var S = { v: 2, remember: true, eye: "OD", tab: "ante", sub: "surface", sel: { OD: {}, OS: {} }, labels: { OD: {}, OS: {} } };
  var subs = { ante: "surface", fundus: "pole" }, watchers = [], persistTimer = null; // subs = per-tab sub-view (plan §3.1)

  function isObj(o) { return !!o && typeof o === "object" && !Array.isArray(o); }
  function validEye(e) { return e === "OD" || e === "OS"; }
  function copySel(eye) {
    var out = {}, k, src = S.sel[eye] || {};
    for (k in src) { if (src.hasOwnProperty(k) && src[k] === true) out[k] = true; }
    return out;
  }
  function sanitizeLabel(v) {
    var s = String(v == null ? "" : v).replace(/\s+/g, " ").trim();
    return s.slice(0, 240);
  }
  function copyLabels(eye) {
    var out = {}, k, src = S.labels[eye] || {};
    for (k in src) { if (src.hasOwnProperty(k) && typeof src[k] === "string" && src[k] !== "") out[k] = src[k]; }
    return out;
  }
  function notify() {
    var i;
    for (i = 0; i < watchers.length; i++) {
      try { watchers[i](); } catch (e) { /* a faulty subscriber must never break state */ }
    }
  }
  function get() {
    return {
      v: S.v, remember: S.remember, eye: S.eye, tab: S.tab, sub: S.sub,
      sel: { OD: copySel("OD"), OS: copySel("OS") },
      labels: { OD: copyLabels("OD"), OS: copyLabels("OS") }
    };
  }

  // Mutations: invalid input is ignored; every valid call notifies exactly once.
  function setEye(eye) {
    if (!validEye(eye)) return;
    S.eye = eye;
    notify();
  }
  function setTab(tab) {
    if (tab !== "ante" && tab !== "fundus") return;
    S.tab = tab;
    subs[tab] = DEFAULT_SUB[tab]; // switching tabs resets the sub-view to the family default
    S.sub = subs[tab];
    notify();
  }
  function setSub(sub) {
    var list = SUBS[S.tab] || [];
    if (list.indexOf(sub) === -1) return; // wrong family or unknown id → ignored
    subs[S.tab] = sub;
    S.sub = sub;
    notify();
  }
  function toggle(id) {
    if (!STRUCTS[id]) return false;
    if (S.sel[S.eye][id] === true) { delete S.sel[S.eye][id]; notify(); return false; }
    S.sel[S.eye][id] = true;
    notify();
    return true;
  }
  function isSelected(id, eyeOpt) {
    var eye = validEye(eyeOpt) ? eyeOpt : S.eye;
    return !!(STRUCTS[id] && S.sel[eye] && S.sel[eye][id] === true);
  }
  function selections(eyeOpt) {
    var eye = validEye(eyeOpt) ? eyeOpt : S.eye, out = [], i, id;
    for (i = 0; i < STRUCT_ORDER.length; i++) {
      id = STRUCT_ORDER[i]; if (S.sel[eye] && S.sel[eye][id] === true) out.push(id);
    }
    return out;
  }
  function clear() { S.sel[S.eye] = {}; notify(); }
  function clearAll() { S.sel.OD = {}; S.sel.OS = {}; notify(); }

  // Labels — a free-text clinical finding per selected structure, per eye
  // ("cornea — 2×3 mm paracentral scar"). Empty string clears the label.
  function setLabel(id, text, eyeOpt) {
    if (!STRUCTS[id]) return;
    var eye = validEye(eyeOpt) ? eyeOpt : S.eye;
    var v = sanitizeLabel(text);
    if (v) S.labels[eye][id] = v; else delete S.labels[eye][id];
    notify();
  }
  function labelFor(id, eyeOpt) {
    var eye = validEye(eyeOpt) ? eyeOpt : S.eye;
    var v = S.labels[eye] ? S.labels[eye][id] : "";
    return typeof v === "string" ? v : "";
  }
  function labels(eyeOpt) {
    var eye = validEye(eyeOpt) ? eyeOpt : S.eye;
    return copyLabels(eye);
  }
  function clearLabels(eyeOpt) {
    var eye = validEye(eyeOpt) ? eyeOpt : S.eye;
    S.labels[eye] = {};
    notify();
  }
  function clearAllLabels() { S.labels = { OD: {}, OS: {} }; notify(); }
  function onChange(cb) {
    if (typeof cb !== "function") return function () {};
    watchers.push(cb);
    return function () {
      var i = watchers.indexOf(cb);
      if (i > -1) watchers.splice(i, 1);
    };
  }

  // Persistence: exact persisted shape + migration guard (plan-integration §3).
  // v2 adds labels; v1 snapshots load fine (labels default to empty).
  function snapshot() {
    return {
      v: 2, remember: S.remember, eye: S.eye, tab: S.tab,
      sub: { ante: subs.ante, fundus: subs.fundus },
      sel: S.remember ? { OD: copySel("OD"), OS: copySel("OS") } : { OD: {}, OS: {} },
      labels: S.remember ? { OD: copyLabels("OD"), OS: copyLabels("OS") } : { OD: {}, OS: {} }
    };
  }
  function sanitizeMap(o) {
    var out = {}, k;
    if (!isObj(o)) return out;
    for (k in o) { if (o.hasOwnProperty(k) && STRUCTS[k] && o[k] === true) out[k] = true; }
    return out;
  }
  function sanitizeLabelMap(o) {
    var out = {}, k, v;
    if (!isObj(o)) return out;
    for (k in o) {
      if (!o.hasOwnProperty(k) || !STRUCTS[k]) continue;
      v = sanitizeLabel(o[k]);
      if (v) out[k] = v;
    }
    return out;
  }
  function hydrate(d) {
    var subMap, sel, labelMap;
    S.remember = true; S.eye = "OD"; S.tab = "ante"; S.sub = "surface";
    subs.ante = "surface"; subs.fundus = "pole";
    S.sel = { OD: {}, OS: {} };
    S.labels = { OD: {}, OS: {} };
    if (!isObj(d)) return; // missing/garbage → safe defaults, never throws (§3.2.1)
    S.remember = d.remember !== false;
    if (validEye(d.eye)) S.eye = d.eye;
    if (d.tab === "ante" || d.tab === "fundus") S.tab = d.tab;
    subMap = isObj(d.sub) ? d.sub : {};
    if (SUBS.ante.indexOf(subMap.ante) > -1) subs.ante = subMap.ante;
    if (SUBS.fundus.indexOf(subMap.fundus) > -1) subs.fundus = subMap.fundus;
    S.sub = subs[S.tab];
    sel = isObj(d.sel) ? d.sel : null;
    if (d.v !== 1 && d.v !== 2 && !(sel && isObj(sel.OD) && isObj(sel.OS))) sel = null; // old-schema salvage (§3.2.2)
    if (S.remember && sel) { // remember=false → selections are never restored (§3.2.5)
      S.sel.OD = sanitizeMap(sel.OD);
      S.sel.OS = sanitizeMap(sel.OS);
    }
    labelMap = isObj(d.labels) ? d.labels : null;
    if (S.remember && d.v === 2 && labelMap) { // labels only exist from v2 on
      if (isObj(labelMap.OD)) S.labels.OD = sanitizeLabelMap(labelMap.OD);
      if (isObj(labelMap.OS)) S.labels.OS = sanitizeLabelMap(labelMap.OS);
    }
  }
  function load(ctx) {
    var data = null;
    try { data = ctx && typeof ctx.loadData === "function" ? ctx.loadData() : null; }
    catch (e) { data = null; }
    return Promise.resolve(data)
      .then(function (d) { hydrate(d); notify(); })
      .catch(function () { hydrate(null); notify(); });
  }
  function flushPersist(ctx) {
    var shape, res;
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
    try {
      if (!ctx || typeof ctx.saveData !== "function") return;
      shape = snapshot();
      if (JSON.stringify(shape).length > 8192) { delete shape.labels; delete shape.sel; } // hostile-size cap (§3.3)
      res = ctx.saveData(shape);
      if (res && typeof res.catch === "function") res.catch(function () {});
    } catch (e) { /* persisting must never break the UI */ }
  }
  function persist(ctx) {
    if (persistTimer) { clearTimeout(persistTimer); }
    persistTimer = setTimeout(function () { persistTimer = null; flushPersist(ctx); }, 250);
  }

  function FAMILY(id) { return STRUCTS[id] ? STRUCTS[id].family : ""; }

  ED.state = {
    STRUCT_ORDER: STRUCT_ORDER, STRUCTS: STRUCTS, FAMILY: FAMILY,
    get: get, setEye: setEye, setTab: setTab, setSub: setSub,
    toggle: toggle, isSelected: isSelected, selections: selections,
    setLabel: setLabel, labelFor: labelFor, labels: labels,
    clearLabels: clearLabels, clearAllLabels: clearAllLabels,
    clear: clear, clearAll: clearAll, onChange: onChange,
    load: load, persist: persist, flushPersist: flushPersist
  };
})(window.__ED__);

  /* ------------------------- ed-ante.js ------------------------- */
window.__ED__ = window.__ED__ || {};
(function (ED) {
  "use strict";
  /* Anterior inventory, canonical order (plan-anterior §1/§5: lids → lacrimal). */
  var ORDER = ["upper_lid", "lower_lid", "lid_margin", "lashes", "medial_canthus", "lateral_canthus", "caruncle", "plica_semilunaris", "palpebral_conjunctiva", "bulbar_conjunctiva", "tear_meniscus", "exposed_sclera", "limbus", "cornea", "iris", "pupil", "superior_punctum", "inferior_punctum", "superior_canaliculus", "inferior_canaliculus", "common_canaliculus", "lacrimal_sac", "nasolacrimal_duct"];
  /* Home sub-view per id; twins (limbus/cornea/iris/pupil) map to "cornea" (plan-anterior §1). */
  var HOME = {
    upper_lid: "surface", lower_lid: "surface", lid_margin: "surface", lashes: "surface",
    medial_canthus: "surface", lateral_canthus: "surface", caruncle: "surface",
    plica_semilunaris: "surface", palpebral_conjunctiva: "surface", bulbar_conjunctiva: "surface",
    tear_meniscus: "surface", exposed_sclera: "surface", limbus: "cornea", cornea: "cornea",
    iris: "cornea", pupil: "cornea", superior_punctum: "lacrimal", inferior_punctum: "lacrimal",
    superior_canaliculus: "lacrimal", inferior_canaliculus: "lacrimal", common_canaliculus: "lacrimal",
    lacrimal_sac: "lacrimal", nasolacrimal_duct: "lacrimal"
  };
  var SUBS = [
    { id: "surface", label: "Surface", keys: ["ante_surface", "anteSurface"] },
    { id: "cornea", label: "Cornea & iris", keys: ["ante_cornea", "anteCornea"] },
    { id: "lacrimal", label: "Lacrimal", keys: ["ante_lacrimal", "anteLacrimal"] }
  ];
  var container = null, strip = null, stage = null, list = null, mountedSub = null, unsub = null;
  var chips = {}, rows = {}, uiBinds = [], svgBinds = [];

  /* --- DOM helpers (spec §3 h() pattern); all listener refs kept for destroy --- */
  function h(tag, cn, txt) { var e = document.createElement(tag); if (cn) e.className = cn; if (txt != null) e.textContent = txt; return e; }
  function A(e, k, v) { e.setAttribute(k, v); }
  function cls(e, name, on) { if (!e || !e.classList) return; if (on) e.classList.add(name); else e.classList.remove(name); }
  function bind(arr, e, type, fn) { if (!e || !e.addEventListener) return; e.addEventListener(type, fn, false); arr.push({ el: e, type: type, fn: fn }); }
  function unbindAll() {
    var a = uiBinds.concat(svgBinds), i;
    for (i = 0; i < a.length; i++) { try { a[i].el.removeEventListener(a[i].type, a[i].fn, false); } catch (e) {} }
    uiBinds.length = 0; svgBinds.length = 0;
  }

  /* --- state access (defensive; pinned surface first, plan-name fallbacks) --- */
  function st() { return ED.state; }
  function getSt() { try { return (st() && st().get) ? st().get() : null; } catch (e) { return null; } }
  function isSubId(v) { for (var i = 0; i < SUBS.length; i++) { if (SUBS[i].id === v) return true; } return false; }
  function curEye() {
    var S = st(), s = getSt();
    if (!s || !s.eye) { if (S && typeof S.getEye === "function") { try { s = { eye: S.getEye() }; } catch (e) {} } }
    return s && s.eye === "OS" ? "OS" : "OD";
  }
  function curSub() {
    var S = st(), s = getSt(), v = s ? s.sub : null;
    if (v && typeof v === "object") v = v.ante;
    if (!isSubId(v) && S && typeof S.getSub === "function") { try { v = S.getSub("ante"); } catch (e) {} }
    return isSubId(v) ? v : "surface";
  }
  function rawSubIs(id) {
    var s = getSt(), v = s ? s.sub : null;
    if (v && typeof v === "object") v = v.ante;
    return v === id;
  }
  function pushSub(id) { /* setSub("ante",id) vs setSub(id): try, verify, fallback */
    var S = st(); if (!S || typeof S.setSub !== "function") return;
    try { S.setSub("ante", id); if (rawSubIs(id)) return; } catch (e) {}
    try { S.setSub(id); } catch (e) {}
  }
  function labelOf(id) {
    var S = st(), t = (S && S.STRUCTS) ? S.STRUCTS[id] : null;
    if (t && t.label) return t.label;
    return id.replace(/(^|_)([a-z])/g, function (m, a, b) { return (a ? " " : "") + b.toUpperCase(); });
  }
  function isAnte(id) {
    var S = st(); if (!S) return true;
    var t = S.STRUCTS ? S.STRUCTS[id] : null;
    if (t && t.family) return t.family === "ante";
    if (typeof S.FAMILY === "function") { try { return S.FAMILY(id) === "ante"; } catch (e) {} }
    return true;
  }
  function selected(id) {
    var S = st(); if (!S) return false;
    if (typeof S.isSelected === "function") { try { return !!S.isSelected(id); } catch (e) {} }
    try { var sel = S.selections ? S.selections(curEye()) : (S.selFor ? S.selFor(curEye()) : null); return !!(sel && sel[id]); } catch (e) {}
    return false;
  }
  function toggleId(id) {
    var S = st(); if (!S || typeof S.toggle !== "function") return;
    try { S.toggle(id); } catch (e) {}
    sync(); /* idempotent; covers state builds that do not emit onChange */
  }
  function subscribe(fn) {
    var S = st();
    if (S && typeof S.onChange === "function") { try { return S.onChange(fn); } catch (e) {} }
    if (S && typeof S.subscribe === "function") { try { return S.subscribe(fn); } catch (e) {} }
    return null;
  }
  function svgSrc(sub) {
    var src = ED.svg; if (!src) return "";
    for (var i = 0; i < SUBS.length; i++) { if (SUBS[i].id === sub) return src[SUBS[i].keys[0]] || src[SUBS[i].keys[1]] || ""; }
    return "";
  }

  /* --- stage --- */
  function renderStage() {
    var sub = curSub(), html = svgSrc(sub);
    svgBinds.length = 0; /* old struct nodes die with the innerHTML swap */
    stage.innerHTML = html || "";
    if (html) wireStructs(); else stage.appendChild(h("p", "ed-ante-empty", "Diagram unavailable"));
    mountedSub = sub;
  }
  function wireOne(el) {
    var id = el.getAttribute("data-struct");
    bind(svgBinds, el, "click", function () { toggleId(id); });
    bind(svgBinds, el, "keydown", function (e) { if (e.key === "Enter" || e.key === " " || e.keyCode === 13 || e.keyCode === 32) { if (e.preventDefault) e.preventDefault(); toggleId(id); } });
    bind(svgBinds, el, "mouseenter", function () { cls(el, "is-hover", true); });
    bind(svgBinds, el, "mouseleave", function () { cls(el, "is-hover", false); });
    bind(svgBinds, el, "focus", function () { cls(el, "is-hover", true); });
    bind(svgBinds, el, "blur", function () { cls(el, "is-hover", false); });
  }
  function wireStructs() {
    var els = stage.querySelectorAll("[data-struct]");
    for (var i = 0; i < els.length; i++) wireOne(els[i]);
  }

  /* --- side list: full 23-id anterior inventory; off-home rows dimmed via .is-off --- */
  function buildRows() {
    list.innerHTML = "";
    rows = {};
    for (var i = 0; i < ORDER.length; i++) {
      (function (id) {
        if (!isAnte(id)) return;
        var b = h("button", "ed-row"), tick = h("span", "ed-tick");
        b.type = "button"; A(b, "aria-pressed", "false"); A(tick, "aria-hidden", "true");
        b.appendChild(tick); b.appendChild(h("span", "ed-row-label", labelOf(id)));
        bind(uiBinds, b, "click", function () { toggleId(id); });
        rows[id] = { row: b, tick: tick }; list.appendChild(b);
      })(ORDER[i]);
    }
  }

  /* --- single idempotent sync point; rebuilds stage only when the sub changed --- */
  function sync() {
    if (!stage || !list) return;
    var sub = curSub(), id, on;
    if (sub !== mountedSub) renderStage();
    for (id in chips) {
      on = (id === sub);
      cls(chips[id], "is-on", on);
      A(chips[id], "aria-pressed", on ? "true" : "false");
    }
    for (id in rows) {
      on = selected(id);
      cls(rows[id].row, "is-sel", on); cls(rows[id].tick, "is-sel", on);
      A(rows[id].row, "aria-pressed", on ? "true" : "false");
      cls(rows[id].row, "is-off", HOME[id] !== sub);
    }
    var els = stage.querySelectorAll("[data-struct]");
    for (var i = 0; i < els.length; i++) {
      var sid = els[i].getAttribute("data-struct");
      cls(els[i], "is-sel", selected(sid));
    }
    on = (curEye() === "OS"); /* mirror class on the stage div only — never on text */
    cls(stage, "ed-mirror", on); cls(stage, "is-mirror", on);
  }

  /* --- public API --- */
  function mount(c) {
    container = c || null;
    if (!container) return;
    container.innerHTML = "";
    if (!st() || !ED.svg) {
      container.appendChild(h("p", "ed-ante-missing", "Essential Diagrams: anterior module unavailable."));
      return;
    }
    strip = h("div", "ed-substrip"); A(strip, "role", "group"); A(strip, "aria-label", "Anterior sub-view");
    for (var i = 0; i < SUBS.length; i++) {
      (function (s) {
        var b = h("button", "ed-subchip", s.label);
        b.type = "button"; A(b, "aria-pressed", "false");
        bind(uiBinds, b, "click", function () { pushSub(s.id); sync(); });
        chips[s.id] = b; strip.appendChild(b);
      })(SUBS[i]);
    }
    stage = h("div", "ed-stage"); A(stage, "aria-hidden", "true"); /* decorative duplication; side list is the a11y path */
    list = h("div", "ed-list"); A(list, "role", "list"); A(list, "aria-label", "Anterior structures");
    container.appendChild(strip); container.appendChild(stage); container.appendChild(list);
    buildRows();
    mountedSub = null;
    sync(); /* renders current sub's SVG + applies all state classes */
    unsub = subscribe(sync);
  }
  function REFRESH() { sync(); } /* idempotent re-apply (is-sel/mirror/chips/dim) after eye or sub switch */
  function destroy() {
    unbindAll();
    if (typeof unsub === "function") { try { unsub(); } catch (e) {} }
    unsub = null;
    if (container) container.innerHTML = "";
    container = null; strip = null; stage = null; list = null;
    chips = {}; rows = {}; mountedSub = null;
  }
  ED.ante = { mount: mount, destroy: destroy, REFRESH: REFRESH, STRUCTS: ORDER };
})(window.__ED__);

  /* ------------------------- ed-fundus.js ------------------------- */
window.__ED__ = window.__ED__ || {};
(function (ED) {
  "use strict";

  var SUBS = [{ id: "pole", label: "Pole" }, { id: "periph", label: "Periphery" }];
  /* plan-fundus §1 inventory — fallback only if ED.state.STRUCTS yields no fundus ids */
  var FALLBACK_IDS = ["optic_disc", "neuroretinal_rim", "optic_cup", "macula", "fovea",
    "arcade_superior_temporal", "arcade_inferior_temporal", "arcade_superior_nasal",
    "arcade_inferior_nasal", "retinal_vessels", "periph_retina_superior",
    "periph_retina_inferior", "periph_retina_nasal", "periph_retina_temporal"];
  var container = null, subEl = null, stageEl = null, listEl = null;
  var chips = [], rows = [], hoverEl = null, unsub = null, bound = [];

  /* ---------- helpers (SVG-safe class ops, tracked listeners) ---------- */
  function setClass(el, name, on) {
    if (!el || !name) return;
    if (el.classList) { if (on) el.classList.add(name); else el.classList.remove(name); return; }
    var svg = el.className && typeof el.className.baseVal === "string";
    var cur = svg ? el.className.baseVal : (el.className || ""), parts = cur.split(/\s+/), keep = [], i;
    for (i = 0; i < parts.length; i++) if (parts[i] && parts[i] !== name) keep.push(parts[i]);
    if (on) keep.push(name);
    if (svg) el.className.baseVal = keep.join(" "); else el.className = keep.join(" ");
  }
  function on(el, ev, fn) {
    if (!el || !el.addEventListener) return;
    el.addEventListener(ev, fn, false);
    bound.push([el, ev, fn]);
  }
  function structOf(node) { /* nearest [data-struct] ancestor within the stage */
    while (node && node !== stageEl) {
      if (node.getAttribute && node.getAttribute("data-struct")) return node;
      node = node.parentNode;
    }
    return null;
  }
  function setHover(g) {
    if (hoverEl && hoverEl !== g) setClass(hoverEl, "is-hover", false);
    hoverEl = g;
    if (g) setClass(g, "is-hover", true);
  }

  /* ---------- state readers (defensive against C1 shape drift) ---------- */
  function curEye() {
    var s = ED.state && ED.state.get ? ED.state.get() : null;
    return s && s.eye && String(s.eye).toUpperCase() === "OS" ? "OS" : "OD";
  }
  function curSub() {
    var s = ED.state && ED.state.get ? ED.state.get() : null;
    var v = s && s.sub ? (typeof s.sub === "object" ? s.sub.fundus : s.sub) : null;
    return v === "periph" ? "periph" : "pole";
  }
  function isSel(id) {
    var st = ED.state || {}, sel;
    if (typeof st.isSelected === "function") {
      try { return !!st.isSelected(id, curEye()); } catch (e) { /* fall through */ }
    }
    sel = typeof st.selections === "function" ? st.selections(curEye()) : null; return !!(sel && sel[id]);
  }
  function toggleId(id) { if (id && ED.state && typeof ED.state.toggle === "function") ED.state.toggle(id); }
  function fundusIds() {
    var st = ED.state || {}, map = st.STRUCTS || {}, ids = [], k, fam;
    for (k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      fam = (map[k] && map[k].family) || (typeof st.FAMILY === "function" ? st.FAMILY(k) : null);
      if (fam === "fundus") ids.push(k);
    }
    return ids.length ? ids : FALLBACK_IDS;
  }
  function labelFor(id) {
    var m = ED.state && ED.state.STRUCTS && ED.state.STRUCTS[id];
    if (m && m.label) return String(m.label);
    return String(id).replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function inPeriphSub(id) { return String(id).indexOf("periph_") === 0; } /* periph_* rows ↔ Periphery view */

  /* ---------- build: substrip / stage / side list ---------- */
  function makeChip(sub) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "ed-sub-btn ed-subchip";
    b.setAttribute("data-sub", sub.id); b.textContent = sub.label;
    on(b, "click", function () { if (curSub() !== sub.id && ED.state && typeof ED.state.setSub === "function") ED.state.setSub(sub.id); sync(); });
    subEl.appendChild(b); return b;
  }
  function buildStrip() {
    subEl = document.createElement("div"); subEl.className = "ed-sub ed-substrip";
    chips = [];
    for (var i = 0; i < SUBS.length; i++) chips.push(makeChip(SUBS[i]));
    container.appendChild(subEl);
  }
  function buildStage() {
    stageEl = document.createElement("div"); stageEl.className = "ed-stage";
    stageEl.setAttribute("aria-hidden", "true"); /* decorative duplication — side list is the a11y path */
    stageEl._edSub = null;
    container.appendChild(stageEl);
    on(stageEl, "click", function (e) { var g = structOf(e.target); if (g) { toggleId(g.getAttribute("data-struct")); sync(); } });
    on(stageEl, "keydown", function (e) {
      var g = structOf(e.target);
      if (!g || (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar")) return;
      if (e.preventDefault) e.preventDefault();
      toggleId(g.getAttribute("data-struct")); sync();
    });
    on(stageEl, "mouseover", function (e) { var g = structOf(e.target); if (g && g !== hoverEl) setHover(g); });
    on(stageEl, "mouseout", function (e) { var g = structOf(e.target); if (g && (!e.relatedTarget || structOf(e.relatedTarget) !== g)) setHover(null); });
    on(stageEl, "focusin", function (e) { var g = structOf(e.target); if (g) setHover(g); });
    on(stageEl, "focusout", function () { setHover(null); });
  }
  function makeRow(id) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "ed-item ed-row";
    b.setAttribute("data-id", id); b.setAttribute("aria-pressed", "false");
    var tick = document.createElement("span"); tick.className = "ed-check ed-tick"; tick.setAttribute("aria-hidden", "true");
    b.appendChild(tick); b.appendChild(document.createTextNode(labelFor(id)));
    on(b, "click", function () { toggleId(id); sync(); });
    listEl.appendChild(b); return b;
  }
  function buildList() {
    listEl = document.createElement("div"); listEl.className = "ed-list";
    rows = [];
    var ids = fundusIds();
    for (var i = 0; i < ids.length; i++) rows.push(makeRow(ids[i]));
    container.appendChild(listEl);
  }

  /* ---------- sync: state → DOM (idempotent re-apply) ---------- */
  function renderStage() {
    var sub = curSub();
    if (stageEl._edSub === sub) return; /* keep DOM + focus intact on selection/eye changes */
    setHover(null); stageEl._edSub = sub;
    var s = ED.svg || {};
    stageEl.innerHTML = sub === "periph" ? (s.fundus_periph || s.fundusPeriph || "") : (s.fundus_pole || s.fundusPole || "");
  }
  function sync() {
    if (!container || !stageEl) return;
    var sub = curSub(), os = curEye() === "OS", i, el, sel, id;
    for (i = 0; i < chips.length; i++) {
      el = chips[i]; sel = el.getAttribute("data-sub") === sub;
      setClass(el, "is-on", sel); el.setAttribute("aria-pressed", sel ? "true" : "false");
    }
    renderStage();
    setClass(stageEl, "ed-mirror", os); /* OS flip — stage div only, never text nodes */
    setClass(stageEl, "is-mirror", os);
    var nodes = stageEl.querySelectorAll("[data-struct]");
    for (i = 0; i < nodes.length; i++) setClass(nodes[i], "is-sel", isSel(nodes[i].getAttribute("data-struct")));
    for (i = 0; i < rows.length; i++) {
      el = rows[i]; id = el.getAttribute("data-id"); sel = isSel(id);
      setClass(el, "is-sel", sel); setClass(el, "is-off", inPeriphSub(id) ? sub !== "periph" : sub !== "pole");
      el.setAttribute("aria-pressed", sel ? "true" : "false");
    }
  }

  /* ---------- lifecycle ---------- */
  function detach(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
  function teardown() {
    var i, b;
    for (i = 0; i < bound.length; i++) {
      b = bound[i];
      if (b[0] && b[0].removeEventListener) b[0].removeEventListener(b[1], b[2], false);
    }
    bound = [];
    if (typeof unsub === "function") { try { unsub(); } catch (e) { /* noop */ } }
    unsub = null;
    detach(subEl); detach(stageEl); detach(listEl); if (stageEl) stageEl._edSub = null;
    chips = []; rows = []; hoverEl = null;
    subEl = null; stageEl = null; listEl = null;
  }
  function mount(c) {
    if (!c || typeof document === "undefined" || !document.createElement) return;
    if (container) teardown(); /* defensive re-mount: never double-bind */
    container = c;
    buildStrip(); buildStage(); buildList();
    if (ED.state && typeof ED.state.onChange === "function") {
      unsub = ED.state.onChange(function () { sync(); });
    } else if (ED.state && typeof ED.state.subscribe === "function") {
      unsub = ED.state.subscribe(function () { sync(); });
    }
    sync();
  }
  function destroy() { teardown(); if (container) container.innerHTML = ""; container = null; }
  function REFRESH() { if (!container) return; sync(); } /* idempotent .is-sel/.is-mirror re-apply (eye switch) */

  ED.fundus = {
    id: "fundus", label: "Fundus", subs: SUBS,
    mount: mount, destroy: destroy,
    REFRESH: REFRESH, refresh: REFRESH /* plan-integration §1.1 alias */
  };
})(window.__ED__);

  /* ------------------------- ed-findings.js ------------------------- */
window.__ED__ = window.__ED__ || {};
(function (ED) {
  "use strict";

  /* id → noun phrase: plan-anterior §5 + plan-fundus §3/§6 (brief-pinned: superior_punctum, neuroretinal_rim, periph_* em-dash). */
  var PHRASES = {
    upper_lid: "upper lid", lower_lid: "lower lid",
    lid_margin: "lid margin", lashes: "lashes",
    medial_canthus: "medial canthus", lateral_canthus: "lateral canthus",
    caruncle: "caruncle", plica_semilunaris: "plica semilunaris",
    palpebral_conjunctiva: "palpebral conjunctiva", bulbar_conjunctiva: "bulbar conjunctiva",
    tear_meniscus: "tear meniscus", exposed_sclera: "sclera",
    cornea: "cornea", limbus: "limbus",
    iris: "iris", pupil: "pupil",
    superior_punctum: "superior punctum", inferior_punctum: "inferior punctum",
    superior_canaliculus: "canaliculus (superior)", inferior_canaliculus: "canaliculus (inferior)",
    common_canaliculus: "common canaliculus", lacrimal_sac: "lacrimal sac",
    nasolacrimal_duct: "nasolacrimal duct",
    optic_disc: "disc", neuroretinal_rim: "neuroretinal rim",
    optic_cup: "cup", macula: "macula",
    fovea: "fovea",
    arcade_superior_temporal: "arcade (superior temporal)", arcade_inferior_temporal: "arcade (inferior temporal)",
    arcade_superior_nasal: "arcade (superior nasal)", arcade_inferior_nasal: "arcade (inferior nasal)",
    retinal_vessels: "vessels",
    periph_retina_superior: "peripheral retina — superior", periph_retina_inferior: "peripheral retina — inferior",
    periph_retina_nasal: "peripheral retina — nasal", periph_retina_temporal: "peripheral retina — temporal"
  };

  /* Within-line order: P1 §5 slit-lamp walk (cornea before limbus per brief sample line); fundus = P2 §1 inventory. */
  var ANT_ORDER = ["upper_lid", "lower_lid", "lid_margin", "lashes", "medial_canthus", "lateral_canthus", "caruncle", "plica_semilunaris", "palpebral_conjunctiva", "bulbar_conjunctiva", "tear_meniscus", "exposed_sclera", "cornea", "limbus", "iris", "pupil", "superior_punctum", "inferior_punctum", "superior_canaliculus", "inferior_canaliculus", "common_canaliculus", "lacrimal_sac", "nasolacrimal_duct"];
  var FUND_ORDER = ["optic_disc", "neuroretinal_rim", "optic_cup", "macula", "fovea", "arcade_superior_temporal", "arcade_inferior_temporal", "arcade_superior_nasal", "arcade_inferior_nasal", "retinal_vessels", "periph_retina_superior", "periph_retina_inferior", "periph_retina_nasal", "periph_retina_temporal"], EYES = ["OD", "OS"];

  function phraseFor(id) {
    if (PHRASES.hasOwnProperty(id)) return PHRASES[id];
    var s = (ED.state && ED.state.STRUCTS) ? ED.state.STRUCTS[id] : null;
    return (s && s.label ? String(s.label) : String(id)).toLowerCase();
  }

  function selMap(eye) { // normalize selections(eye) (array|map) or get().sel[eye] into a truthy map
    var st = ED.state || {}, raw = null, map = {}, g, i, k;
    try { if (typeof st.selections === "function") raw = st.selections(eye); } catch (e) { raw = null; }
    if (!raw) {
      try { g = typeof st.get === "function" ? st.get() : null; if (g && g.sel && g.sel[eye]) raw = g.sel[eye]; } catch (e2) { raw = null; }
    }
    if (raw && typeof raw === "object") {
      if (typeof raw.length === "number") { for (i = 0; i < raw.length; i++) { if (raw[i]) map[String(raw[i])] = true; } }
      else { for (k in raw) { if (raw[k]) map[k] = true; } }
    }
    return map;
  }

  function famOf(id) {
    var s = (ED.state && ED.state.STRUCTS) ? ED.state.STRUCTS[id] : null, f = "";
    try { if (ED.state && typeof ED.state.FAMILY === "function") f = String(ED.state.FAMILY(id) || ""); } catch (e) { f = ""; }
    if (!f && s && s.family) f = String(s.family);
    return /ant/i.test(f) ? "ante" : (/fund/i.test(f) ? "fundus" : "");
  }

  function eyeParts(eye) { // canonical order first; unknown-but-registered ids append via family
    var map = selMap(eye), out = { ante: [], fundus: [] }, i, k, f;
    for (i = 0; i < ANT_ORDER.length; i++) { if (map[ANT_ORDER[i]]) { out.ante.push(ANT_ORDER[i]); delete map[ANT_ORDER[i]]; } }
    for (i = 0; i < FUND_ORDER.length; i++) { if (map[FUND_ORDER[i]]) { out.fundus.push(FUND_ORDER[i]); delete map[FUND_ORDER[i]]; } }
    for (k in map) { if (!map[k]) continue; f = famOf(k); if (f) out[f].push(k); }
    return out;
  }

  function lineFor(fam, eye, ids, labels) {
    if (!ids || !ids.length) return ""; // empty groups are skipped (plan-integration §4.1)
    var parts = [], i;
    for (i = 0; i < ids.length; i++) parts.push(phraseFor(ids[i]) + labelSuffix(labels, eye, ids[i]));
    return (fam === "ante" ? "Anterior segment (" : "Fundus (") + eye + "): " + parts.join(", ");
  }

  /* Optional per-structure labels — { OD: { cornea: "2×3 mm scar" }, OS: {...} }.
     A label appends as "phrase — label"; absent/empty labels stay phrase-only. */
  function labelSuffix(labels, eye, id) {
    var byEye = (labels && typeof labels === "object") ? labels[eye] : null;
    var t = (byEye && typeof byEye[id] === "string") ? byEye[id].trim() : "";
    return t ? " — " + t : "";
  }

  function build(labels) {
    var lines = [], fams = ["ante", "fundus"], f, i, line;
    var parts = { OD: eyeParts("OD"), OS: eyeParts("OS") };
    for (f = 0; f < fams.length; f++) {
      for (i = 0; i < EYES.length; i++) {
        line = lineFor(fams[f], EYES[i], parts[EYES[i]][fams[f]], labels);
        if (line) lines.push(line);
      }
    }
    return lines.join("\n");
  }

  /* One family only ("ante" | "fundus") — the exam embed routes each
     family's lines into its own note field (slit-lamp vs fundus). */
  function buildFamily(fam, labels) {
    if (fam !== "ante" && fam !== "fundus") return "";
    var lines = [], i, line;
    var parts = { OD: eyeParts("OD"), OS: eyeParts("OS") };
    for (i = 0; i < EYES.length; i++) {
      line = lineFor(fam, EYES[i], parts[EYES[i]][fam], labels);
      if (line) lines.push(line);
    }
    return lines.join("\n");
  }

  function preview(labels) { var t = build(labels); return t ? t.split("\n") : []; }

  function resolveCtx(explicit) { // insert(ctx) passes ctx; copy() reads the outer Function(ctx) binding
    if (explicit && (explicit.app || typeof explicit.showToast === "function")) return explicit;
    try { if (typeof ctx !== "undefined" && ctx) return ctx; } catch (e) { /* no outer ctx */ }
    return explicit || null;
  }

  function toast(c, msg) { try { if (c && typeof c.showToast === "function") c.showToast(msg); } catch (e) { /* muted */ } }

  function fallbackCopy(text) { // textarea + execCommand; created/destroyed per copy, never mirrored
    try {
      if (typeof document === "undefined" || !document.body || !document.createElement) return false;
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "readonly"); ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta);
      ta.select();
      var ok;
      try { ok = document.execCommand("copy") === true; } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function writeClipboard(text) {
    return new Promise(function (resolve) {
      var clip = (typeof navigator !== "undefined" && navigator) ? navigator.clipboard : null;
      if (clip && typeof clip.writeText === "function") {
        try { clip.writeText(text).then(function () { resolve(true); }, function () { resolve(fallbackCopy(text)); }); return; } catch (e) { /* fall through */ }
      }
      resolve(fallbackCopy(text));
    });
  }

  function copy() {
    var c = resolveCtx(null), text = build();
    if (!text) { toast(c, "No structures selected"); return Promise.resolve(false); }
    return writeClipboard(text).then(function (ok) {
      if (ok === true) { toast(c, "Findings copied"); return true; }
      toast(c, "Copy failed — use Insert into note");
      return false;
    });
  }

  function insert(explicit) {
    var c = resolveCtx(explicit), text = build(), app = (c && c.app) ? c.app : null, note = null, p;
    if (!text) { toast(c, "No structures selected"); return Promise.resolve(false); }
    try { if (app && typeof app.getActiveNote === "function") note = app.getActiveNote(); } catch (e) { note = null; }
    if (!note) { toast(c, "Open a note first — findings need an active note"); return Promise.resolve(false); }
    try { if (app && typeof app.insertIntoActiveNote === "function") p = app.insertIntoActiveNote(text + "\n"); } catch (e) { p = null; }
    if (!p || typeof p.then !== "function") p = Promise.resolve(p === true);
    return p.then(function (ok) {
      if (ok === true) { toast(c, "Findings inserted into note"); return true; }
      toast(c, "Insert failed");
      return false;
    }, function () { toast(c, "Insert failed"); return false; });
  }

  ED.findings = {
    build: build, buildFamily: buildFamily, copy: copy, insert: insert,
    preview: preview, PHRASES: PHRASES,
    ORDER: { ante: ANT_ORDER, fundus: FUND_ORDER }
  };
})(window.__ED__);

  /* ------------------------- ed-shell.js ------------------------- */
/* =========================================================== Essential Diagrams — shell (v1.1.0)
   CSS + settings + boot ONLY — the view, sidebar section, commands and
   ribbon are gone (FIX: an examination tool must not surface as app
   chrome). The Examination workup's ExamDiagram sheet embeds the ante/
   fundus modules directly and drives state + findings from there.
   Consumes sibling namespaces on window.__ED__: state, ante, fundus, findings. ES5 only. */
window.__ED__ = window.__ED__ || {};
(function (ED) {
  "use strict";

  var ctxRef = null; /* set by boot */

  /* -------------------------------- css ---------------------------------- */

  var CSS = [
    "/* == Essential Diagrams (auto-managed, removed on unload) == */",
    "/* The Examination workup's diagram sheet mounts the ante/fundus modules",
    "   under an .ed-view root, so every selector below applies unchanged. */",
    ".ed-view { display:flex; flex-direction:column; gap:10px; font-size:13px; color:var(--foreground,#e5e7eb); min-width:0; }",
    ".ed-view * { box-sizing:border-box; }",
    ".ed-view button { font:inherit; color:inherit; background:none; border:0; padding:0; cursor:pointer; text-align:left; }",
    ".ed-view .ed-substrip { display:flex; gap:6px; flex-wrap:wrap; }",
    ".ed-view .ed-subchip { padding:3px 10px; font-size:11.5px; border:1px solid var(--border,#374151); border-radius:999px; color:var(--muted-foreground,#9ca3af); }",
    ".ed-view .ed-subchip.is-on { border-color:var(--accent-live,#2979ff); color:var(--accent-live,#2979ff); background:rgba(41,121,255,.12); }",
    ".ed-view .ed-stage { border:1px solid var(--border,#374151); border-radius:12px; background:var(--card,#111827); overflow:hidden; }",
    ".ed-view .ed-stage svg { display:block; width:100%; height:auto; }",
    ".ed-stage.ed-mirror svg, .ed-stage .ed-mirror svg { transform:scaleX(-1); }",
    ".ed-view [data-struct] { cursor:pointer; transition:opacity .12s; }",
    ".ed-view [data-struct]:hover { opacity:.92; }",
    ".ed-view [data-struct].is-hover { stroke:var(--accent-live,#2979ff); }",
    ".ed-view [data-struct].is-sel { stroke:var(--accent-live,#2979ff) !important; stroke-width:2.5; outline:none; }",
    ".ed-view [data-struct].is-sel [data-fill] { fill:rgba(41,121,255,.18); }",
    ".ed-view [data-struct].is-dim { opacity:.35; }",
    ".ed-view [data-struct]:focus-visible { outline:2px solid var(--accent-live,#2979ff); outline-offset:2px; }",
    ".ed-view .ed-list { display:flex; flex-direction:column; overflow-y:auto; max-height:140px; border:1px solid var(--border,#374151); border-radius:10px; }",
    ".ed-view .ed-row { display:flex; align-items:center; gap:8px; width:100%; padding:6px 10px; }",
    ".ed-view .ed-row:hover { background:var(--card,#111827); }",
    ".ed-view .ed-row[aria-pressed='true'] { background:rgba(41,121,255,.10); color:var(--accent-live,#2979ff); font-weight:600; }",
    ".ed-view .ed-row.is-off { opacity:.45; }",
    ".ed-view .ed-tick { flex:0 0 14px; width:14px; height:14px; border:1.5px solid var(--border,#374151); border-radius:4px; }",
    ".ed-view .ed-tick.is-sel { background:var(--accent-live,#2979ff); border-color:var(--accent-live,#2979ff); }",
    ".ed-view button:focus-visible, .ed-switch:focus-visible { outline:2px solid var(--accent-live,#2979ff); outline-offset:2px; }",
    ".ed-set-row { display:flex; align-items:center; gap:10px; padding:8px 0; }",
    ".ed-switch { position:relative; flex:0 0 34px; width:34px; height:20px; border:1px solid var(--border,#374151); border-radius:999px; background:var(--card,#111827); cursor:pointer; }",
    ".ed-switch::after { content:''; position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:var(--muted-foreground,#9ca3af); transition:left .15s ease; }",
    ".ed-switch.is-on { background:var(--accent-live,#2979ff); border-color:var(--accent-live,#2979ff); }",
    ".ed-switch.is-on::after { left:16px; background:#fff; }",
    ".ed-set-note { font-size:11px; color:var(--muted-foreground,#9ca3af); }"
  ].join("\n");

  /* ------------------------------ helpers --------------------------------- */

  function h(tag, style, text) {
    var node = document.createElement(tag);
    if (style) node.style.cssText = style;
    if (text != null) node.textContent = text;
    return node;
  }

  function hasState() {
    return typeof ED.state !== "undefined" && ED.state && typeof ED.state.get === "function";
  }

  /* ------------------------------- settings ------------------------------- */

  function renderSettings(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    var wrap = h("div", "display:flex;flex-direction:column;gap:6px;padding:6px 0;", "");
    wrap.appendChild(h("div", "font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted-foreground,#9ca3af);", "Essential Diagrams"));

    var row = h("div", "", "");
    row.className = "ed-set-row";
    var info = h("div", "flex:1;min-width:0;", "");
    info.appendChild(h("div", "font-size:12.5px;font-weight:600;", "Remember selections"));
    info.appendChild(h("div", "font-size:11px;color:var(--muted-foreground,#9ca3af);", "Selections and labels persist while the workup is open; off clears them on reload."));
    var sw = h("button", "", "");
    sw.className = "ed-switch";
    sw.setAttribute("type", "button");
    sw.setAttribute("role", "switch");
    sw.setAttribute("aria-label", "Remember selections");
    row.appendChild(info);
    row.appendChild(sw);

    function paint() {
      var on = true;
      try { on = ED.state.get().remember !== false; } catch (e) { /* default on */ }
      sw.className = "ed-switch" + (on ? " is-on" : "");
      sw.setAttribute("aria-checked", on ? "true" : "false");
    }
    sw.addEventListener("click", function () {
      try {
        var st = ED.state.get();
        st.remember = !(st.remember !== false);
        if (typeof ED.state.persist === "function") ED.state.persist(ctxRef);
      } catch (e) { /* non-fatal */ }
      paint();
    });
    paint();

    wrap.appendChild(row);
    var note = h("div", "font-size:11px;color:var(--muted-foreground,#9ca3af);", "The Examination workup embeds these diagrams — labeled findings are added to the exam note from there.");
    wrap.appendChild(note);
    el.appendChild(wrap);
  }

  /* --------------------------------- boot --------------------------------- */

  function boot(ctx) {
    ctxRef = ctx || null;
    function safe(fn) {
      try { fn(); } catch (e) { try { console.warn("[essential-diagrams] boot step failed:", e); } catch (e2) { /* ignore */ } }
    }

    /* 1. CSS — the ed-* classes the exam embed's modules rely on */
    safe(function () { ctx.registerCss(CSS); });

    /* 2. settings pane ("Remember selections") */
    safe(function () { ctx.addSettingsPane(renderSettings); });

    /* 3. state load + unload */
    safe(function () { if (hasState() && typeof ED.state.load === "function") ED.state.load(ctx); });
    safe(function () {
      ctx.onunload = function () {
        try { if (ED.state && typeof ED.state.flushPersist === "function") ED.state.flushPersist(ctx); } catch (e) { /* non-fatal */ }
      };
    });
  }

  ED.shell = {
    boot: boot,
    /* flush() — persist selections + labels on demand (the Examination
       workup's diagram sheet calls this on close/commit; the host has no
       plugin ctx of its own) */
    flush: function () {
      try {
        if (ctxRef && hasState() && typeof ED.state.flushPersist === "function") ED.state.flushPersist(ctxRef);
      } catch (e) { /* non-fatal */ }
    }
  };
})(window.__ED__);

  /* ============================== boot ================================ */

  (function (ED) {
    "use strict";
    try {
      ED.shell.boot(ctx);
    } catch (e) {
      try { console.error("[essential-diagrams] boot failed:", e); } catch (e2) {}
    }
  })(window.__ED__);
})(ctx);
