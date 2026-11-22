# Collecting the RentSaathi dataset — legal, ethical, and practical

We have **no labelled dataset yet**. This guide is deliberately a *manual* workflow: no scrapers, no
bots, no automation against OLX, Facebook Marketplace or Zameen. Their terms of service forbid it,
and a final-year project must be defensible.

## Golden rules

1. **Consent first.** Ask before photographing anyone's room. Use the consent note below.
2. **No people, no documents, no house numbers.** Blur faces, CNICs, car plates and exact addresses.
3. **Record the source.** Every file needs a source and licence note in `raw/SOURCES.csv`.
4. **Never scrape.** Manual saving of a handful of public listing photos is acceptable for academic
   comparison only; bulk crawling is not.
5. **Keep the split clean.** Never move a photo (or a copy) between `train`, `val` and `test` by hand.
   Always re-run `organize_dataset.py`.

### Consent note (copy into WhatsApp / print)

> Assalam-o-Alaikum. We are final-year students building RentSaathi, a project that helps students
> find safe rooms and helps landlords show honest listings. May we photograph this room for our
> university project? Photos will be used only to train a fraud-detection model, will not show
> people or personal documents, and will not be published with the address. You can ask us to delete
> them at any time.

## Folder layout

```
raw/
  genuine/        real rooms, photographed by the team or shared with consent
  stock/          catalogue / stock / clearly reused photos
  SOURCES.csv     file,source,licence,collectedBy,date,consent
```

**Naming convention (important for leakage-safe splitting):**

* Photos of the same room: `gujrat_room01__a.jpg`, `gujrat_room01__b.jpg`, `gujrat_room01__c.jpg`
  — the part before `__` is the group. All photos of one room always land in the same split.
* Stock photos: `unsplash_bedroom_0042.jpg`, `pexels_room_118.jpg`.
* Never rename an augmented copy to hide its origin; `augment_duplicates.py` does that for you.

## Where to get images

| Source | Class | Licence / note |
|---|---|---|
| Team + friends' hostel rooms (with consent) | genuine | best data: Pakistani rooms, fans, charpais, real mess kitchens |
| Landlord contacts from the team's neighbourhood | genuine | ask for 5–10 photos per room; record consent |
| [Unsplash](https://unsplash.com), [Pexels](https://www.pexels.com), [Pixabay](https://pixabay.com) | stock | free licences; avoid photos with recognisable people; record the photo URL |
| Kaggle: **MIT Indoor Scenes** | stock / indoor scenes | check the dataset licence on Kaggle; academic use |
| Kaggle: **Places365** (bedroom, living room, dorm classes) | stock | very large; download only the classes you need |
| Public listings saved manually | stock (reused) | a *few* images, academic use, record URL and date; do not crawl |

Do **not** write or run a scraper for OLX, Facebook, Zameen, Graana or any portal. If you need a
portal image, save it manually, note the URL, and use it only for the academic duplicate-detection
demo.

## Three-member collection plan (Week 1)

| Member | Genuine target | Stock target | Area |
|---|---|---|---|
| A | 150 photos (≈30 rooms × 5) | 150 | Gujrat / university hostels |
| B | 150 photos | 150 | Lahore (Model Town, Johar Town) |
| C | 150 photos | 150 | Islamabad / Rawalpindi |

Minimum viable: **300+ per class**. Good: **500–1000 per class**. More important than raw count:
variety of rooms, lighting, phone cameras, angles, and honest imperfections.

Track progress in `raw/SOURCES.csv`; `dataset_stats.py` prints the balance.

## Labelling checklist

A photo is **genuine** when:
- [ ] it shows the actual room being advertised (not a catalogue render),
- [ ] it was taken by the team/landlord for this listing (consent recorded),
- [ ] it has natural imperfections: uneven light, personal items, local furniture, phone-camera noise,
- [ ] it does not contain a stock watermark or a portal overlay,
- [ ] no people, documents or identifiable address are visible.

A photo is **stock_or_reused** when:
- [ ] it comes from Unsplash/Pexels/Pixabay/Kaggle or a catalogue,
- [ ] it has a watermark, portal logo or screenshot frame,
- [ ] it is a duplicate/near-duplicate of a photo used in another listing,
- [ ] it looks like a hotel/hostel brochure rather than a specific rentable room.

Exclude: blurry beyond recognition, screenshots of text, floor plans, exterior-only shots with no
room, and anything you cannot legally use.

## After collection

```bash
cd dataset-tools
python organize_dataset.py --raw ../raw --out ../dataset --clean
python augment_duplicates.py --dataset ../dataset --copies 3
python dataset_stats.py --dataset ../dataset
```

Then follow the training steps in the root README.

## Dataset roadmap

| Week | Work |
|---|---|
| 1 | Collect ~150 genuine + ~150 stock per member (≈450 + 450 total). Record sources and consent. |
| 2 | Organize (leakage-safe split), augment duplicates, review stats, fix class imbalance. |
| 3 | Train (`train.py`), evaluate (`evaluate.py`), switch `AI_MODE=trained`, write the report. |

Minimum viable: **300+ images per class**. Ideal: **500–1000 per class**. Never claim an accuracy
the dataset cannot support — report the test-set numbers from `reports/metrics.json` and mention the
dataset size and limitations.
