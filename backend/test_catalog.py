#!/usr/bin/env python
"""Catalog regression tests over the complete structured PDF record set."""

import unittest

from rag.catalog import (
    catalog_categories,
    catalog_records,
    get_catalog_record,
    search_catalog,
)


class CatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.records = catalog_records()

    def test_catalog_has_all_94_unique_product_records(self):
        self.assertEqual(len(self.records), 94)
        self.assertEqual(len({record["id"] for record in self.records}), 94)
        self.assertEqual(
            len({record["registrationNumber"] for record in self.records}),
            94,
        )

    def test_searches_supported_identity_fields(self):
        self.assertEqual(len(search_catalog("Biogesic")), 4)
        self.assertTrue(search_catalog("Paracetamol"))
        self.assertTrue(
            all(
                "paracetamol"
                in " ".join(
                    [
                        record.get("genericName") or "",
                        *(record.get("activeIngredients") or []),
                    ]
                ).lower()
                for record in search_catalog("Paracetamol")
            )
        )
        ibuprofen = search_catalog("Ibuprofen")
        self.assertTrue(ibuprofen)
        self.assertTrue(
            all(
                "ibuprofen" in " ".join(record["activeIngredients"]).lower()
                or "ibuprofen" in (record.get("genericName") or "").lower()
                for record in ibuprofen
            )
        )
        registration = search_catalog("DR-153")
        self.assertEqual(
            [record["registrationNumber"] for record in registration],
            ["DR-153"],
        )

    def test_pdf_category_filters_partition_the_catalog(self):
        categories = catalog_categories()
        self.assertEqual(len(categories), 3)
        self.assertEqual(sum(item["count"] for item in categories), 94)
        for item in categories:
            filtered = search_catalog(category=item["name"])
            self.assertEqual(len(filtered), item["count"])
            self.assertTrue(
                all(record["category"] == item["name"] for record in filtered)
            )

    def test_formulations_remain_separate(self):
        biogesic = search_catalog("Biogesic")
        self.assertEqual(len(biogesic), 4)
        self.assertEqual(
            {record["registrationNumber"] for record in biogesic},
            {"DR-XY45639", "DR-XY46366", "DR-153", "DRP-8763"},
        )
        self.assertEqual(len({record["id"] for record in biogesic}), 4)
        self.assertTrue(any("Orange Flavor" in record["dosageForm"] for record in biogesic))
        self.assertTrue(any("Melon Flavor" in record["dosageForm"] for record in biogesic))

    def test_detail_has_supported_fields_indications_and_citations(self):
        summary = next(
            record
            for record in self.records
            if record["registrationNumber"] == "DRP-8716"
        )
        detail = get_catalog_record(summary["id"])
        self.assertIsNotNone(detail)
        self.assertEqual(detail["manufacturer"], "Amherst Laboratories, Inc.")
        self.assertTrue(detail["indications"])
        self.assertGreaterEqual(len(detail["citations"]), 2)
        self.assertTrue(
            all(citation["source"].endswith(".pdf") for citation in detail["citations"])
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
