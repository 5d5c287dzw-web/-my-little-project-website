# Little Flight Radar · first-kit validation

This is an internal working plan for LP-001. The public concept artwork and copy are not evidence of a finished kit. Keep checkout off until the physical kit, fulfilment and test order are proven.

## First action: establish the actual bill of materials

Record each physical part with manufacturer, exact part number, revision, quantity, supplier link, unit price, VAT treatment, shipping/landed cost, lead time and an acceptable alternate. Include the display, receiver, antenna, processor, power parts, leads, enclosure, fixings and packaging only if they are actually in the chosen prototype. Mark anything still proposed as unconfirmed. Link the dated BOM in the Admin Desk's **Flight Radar → Bill of materials** evidence field.

| Part and revision | Qty | Supplier and availability | Landed cost | Tested alternate | Confirmed? |
| --- | ---: | --- | ---: | --- | --- |
| To be recorded from the prototype | — | — | — | — | No |

## Repeatable test record

Build at least one complete kit from the recorded BOM and repeat the setup from the draft family guide. Record the date, kit and software revisions, test location, observations, faults, fixes and whether aircraft data was genuinely received. Keep sample or simulated data clearly labelled. Photograph the actual kit, packaging and the relevant build stages. A video should show the real result and limits, without implying guaranteed aircraft reception.

## Family experience and support

- Verify that the chosen assembly method is solder-free, or clearly describe any supervised or pre-assembled work.
- Test the guide with the same parts a buyer would receive. Capture setup friction and troubleshooting before marking it verified.
- Assess age guidance, supervision, power, antenna, enclosure and applicable UK product obligations for the final configuration. Record the review and evidence; no age or safety claim is approved by this plan.
- Version the guide, software and parts against the kit revision. Link the approved Git documentation and YouTube demonstration in the product record so My Workshop can show them from the same source.

## Price and supply decision

Calculate the true delivered cost: parts + packaging + inbound freight + fulfilment + payment fees + replacement allowance + applicable tax. Compare a core kit under £40 with any optional higher-price variant. Record the supplier terms and choose stocked, drop-ship or hybrid fulfilment based on lead time, returns, quality checks and who owns customer support. The current planned price and supplier field in Admin Desk are not supplier agreements.

### Architecture and price check · 11 November 2026

First decide whether LP-001 is a **self-contained local ADS-B receiver with a round screen**, an **add-on for a computer/receiver the customer already owns**, or an **internet-data display**. These deliver different experiences and need different product claims, support and pricing. The live page currently describes the first option as a concept, so do not quietly substitute another one.

An illustrative UK retail basket for the first option is already **£93 before antenna, storage, power, enclosure, cables, packaging or fulfilment**: [Raspberry Pi 3 Model A+](https://thepihut.com/products/raspberry-pi-3-model-a-plus) £24, [FlightAware Pro Stick Plus](https://thepihut.com/products/flightaware-pro-stick-plus-usb-sdr-ads-b-receiver) £52.50, and a [1.28-inch round display](https://thepihut.com/collections/tft-displays) £16.50. The [Raspberry Pi flight-tracker tutorial](https://www.raspberrypi.com/tutorials/build-your-own-raspberry-pi-flight-tracker/) demonstrates a Pi 3 A+ and an RTL2832/R820T-based USB receiver, but it does not validate this screen, our software or an assembled kit. These are **retail reference prices and a feasibility warning, not the chosen BOM or a supplier quote**. Recheck stock, exact models and prices when sourcing.

The highest-priority product decision is therefore the actual prototype architecture and parts. Do not mark the under-£40 core price as verified until a tested BOM and delivered-cost calculation support it. A premium full-receiver kit and an affordable core variant may both be possible, but their contents must be explicit.

## Order gate

After the above evidence is recorded, build a test-mode checkout with a real order record, fulfilment handoff and revision-matched Workshop entitlement. Verify success, cancellation, failed payment, duplicate webhook, refund and replacement paths before any live charge or customer access. The current site has no checkout or purchased-kit entitlement.

Use the Admin Desk's Flight Radar checks for status, evidence, decisions and next action. Its launch snapshot reuses those entries in the weekly review. Keep assumptions as **Missing**, **In progress** or **Blocked** until evidence is recorded.
