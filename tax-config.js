/* Planning assumptions supplied for MVP 2026.1; not individual tax tariffs. */
(function(root){
  root.TaxConfig={
  "taxModel": {
    "version": "2026.1",
    "incomeThresholds": {
      "lowMax": 80000,
      "mediumMax": 130000
    },
    "capitalTaxReferenceAmounts": [
      50000,
      100000,
      250000,
      500000,
      1000000
    ],
    "cantons": {
      "AG": {
        "name": "Aargau",
        "incomeTaxPct": {
          "low": 11.5,
          "medium": 14.5,
          "high": 17.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 3.12,
          "100000": 4.85,
          "250000": 7.09,
          "500000": 8.22,
          "1000000": 8.77
        }
      },
      "AI": {
        "name": "Appenzell Innerrhoden",
        "incomeTaxPct": {
          "low": 9.5,
          "medium": 11.5,
          "high": 14.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 2.38,
          "100000": 3.31,
          "250000": 4.6,
          "500000": 5.14,
          "1000000": 5.34
        }
      },
      "AR": {
        "name": "Appenzell Ausserrhoden",
        "incomeTaxPct": {
          "low": 13.5,
          "medium": 16.5,
          "high": 19.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 7.56,
          "100000": 7.94,
          "250000": 8.96,
          "500000": 9.91,
          "1000000": 11.14
        }
      },
      "BE": {
        "name": "Bern",
        "incomeTaxPct": {
          "low": 15.0,
          "medium": 18.0,
          "high": 21.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 3.5,
          "100000": 4.63,
          "250000": 6.53,
          "500000": 8.26,
          "1000000": 9.62
        }
      },
      "BL": {
        "name": "Basel-Landschaft",
        "incomeTaxPct": {
          "low": 14.5,
          "medium": 18.5,
          "high": 22.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 3.46,
          "100000": 3.84,
          "250000": 4.86,
          "500000": 6.72,
          "1000000": 9.56
        }
      },
      "BS": {
        "name": "Basel-Stadt",
        "incomeTaxPct": {
          "low": 13.5,
          "medium": 16.5,
          "high": 19.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 3.66,
          "100000": 5.29,
          "250000": 8.26,
          "500000": 9.45,
          "1000000": 9.97
        }
      },
      "FR": {
        "name": "Freiburg",
        "incomeTaxPct": {
          "low": 15.0,
          "medium": 18.0,
          "high": 21.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 1.96,
          "100000": 3.24,
          "250000": 6.96,
          "500000": 9.3,
          "1000000": 10.4
        }
      },
      "GE": {
        "name": "Genf",
        "incomeTaxPct": {
          "low": 14.0,
          "medium": 18.0,
          "high": 21.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 2.53,
          "100000": 4.13,
          "250000": 6.22,
          "500000": 7.41,
          "1000000": 8.11
        }
      },
      "GL": {
        "name": "Glarus",
        "incomeTaxPct": {
          "low": 12.0,
          "medium": 14.0,
          "high": 16.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 4.79,
          "100000": 5.17,
          "250000": 6.19,
          "500000": 6.73,
          "1000000": 6.93
        }
      },
      "GR": {
        "name": "Graubünden",
        "incomeTaxPct": {
          "low": 11.5,
          "medium": 14.5,
          "high": 17.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 2.91,
          "100000": 3.28,
          "250000": 4.31,
          "500000": 5.76,
          "1000000": 5.96
        }
      },
      "JU": {
        "name": "Jura",
        "incomeTaxPct": {
          "low": 14.0,
          "medium": 17.5,
          "high": 21.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 5.39,
          "100000": 6.17,
          "250000": 8.56,
          "500000": 9.64,
          "1000000": 10.11
        }
      },
      "LU": {
        "name": "Luzern",
        "incomeTaxPct": {
          "low": 11.5,
          "medium": 14.0,
          "high": 16.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 2.27,
          "100000": 3.76,
          "250000": 5.45,
          "500000": 6.22,
          "1000000": 6.53
        }
      },
      "NE": {
        "name": "Neuenburg",
        "incomeTaxPct": {
          "low": 17.0,
          "medium": 20.0,
          "high": 23.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 4.89,
          "100000": 5.68,
          "250000": 7.83,
          "500000": 8.46,
          "1000000": 8.75
        }
      },
      "NW": {
        "name": "Nidwalden",
        "incomeTaxPct": {
          "low": 10.5,
          "medium": 13.0,
          "high": 15.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 2.67,
          "100000": 3.64,
          "250000": 5.01,
          "500000": 5.55,
          "1000000": 5.74
        }
      },
      "OW": {
        "name": "Obwalden",
        "incomeTaxPct": {
          "low": 11.0,
          "medium": 12.5,
          "high": 14.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 5.28,
          "100000": 5.66,
          "250000": 6.68,
          "500000": 7.22,
          "1000000": 7.42
        }
      },
      "SG": {
        "name": "St. Gallen",
        "incomeTaxPct": {
          "low": 14.0,
          "medium": 17.5,
          "high": 20.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 5.51,
          "100000": 5.88,
          "250000": 6.91,
          "500000": 7.45,
          "1000000": 7.65
        }
      },
      "SH": {
        "name": "Schaffhausen",
        "incomeTaxPct": {
          "low": 10.5,
          "medium": 13.5,
          "high": 16.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 1.98,
          "100000": 3.18,
          "250000": 4.83,
          "500000": 5.37,
          "1000000": 5.57
        }
      },
      "SO": {
        "name": "Solothurn",
        "incomeTaxPct": {
          "low": 15.0,
          "medium": 18.0,
          "high": 21.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 3.48,
          "100000": 4.97,
          "250000": 6.97,
          "500000": 7.64,
          "1000000": 7.84
        }
      },
      "SZ": {
        "name": "Schwyz",
        "incomeTaxPct": {
          "low": 8.0,
          "medium": 10.0,
          "high": 12.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 1.14,
          "100000": 2.15,
          "250000": 5.26,
          "500000": 7.77,
          "1000000": 9.55
        }
      },
      "TG": {
        "name": "Thurgau",
        "incomeTaxPct": {
          "low": 12.5,
          "medium": 15.0,
          "high": 17.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 6.23,
          "100000": 6.61,
          "250000": 7.63,
          "500000": 8.17,
          "1000000": 8.37
        }
      },
      "TI": {
        "name": "Tessin",
        "incomeTaxPct": {
          "low": 12.0,
          "medium": 15.5,
          "high": 19.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 4.02,
          "100000": 4.4,
          "250000": 5.42,
          "500000": 7.1,
          "1000000": 8.09
        }
      },
      "UR": {
        "name": "Uri",
        "incomeTaxPct": {
          "low": 11.0,
          "medium": 13.0,
          "high": 15.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 3.87,
          "100000": 4.24,
          "250000": 5.27,
          "500000": 5.81,
          "1000000": 6.0
        }
      },
      "VD": {
        "name": "Waadt",
        "incomeTaxPct": {
          "low": 15.0,
          "medium": 18.0,
          "high": 21.5
        },
        "capitalWithdrawalTaxPct": {
          "50000": 3.34,
          "100000": 4.59,
          "250000": 6.95,
          "500000": 8.39,
          "1000000": 9.06
        }
      },
      "VS": {
        "name": "Wallis",
        "incomeTaxPct": {
          "low": 12.0,
          "medium": 16.0,
          "high": 20.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 4.36,
          "100000": 4.74,
          "250000": 6.13,
          "500000": 8.78,
          "1000000": 10.3
        }
      },
      "ZG": {
        "name": "Zug",
        "incomeTaxPct": {
          "low": 4.5,
          "medium": 7.0,
          "high": 9.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 1.77,
          "100000": 2.81,
          "250000": 4.6,
          "500000": 5.76,
          "1000000": 6.28
        }
      },
      "ZH": {
        "name": "Zürich",
        "incomeTaxPct": {
          "low": 10.5,
          "medium": 13.5,
          "high": 17.0
        },
        "capitalWithdrawalTaxPct": {
          "50000": 4.5,
          "100000": 4.88,
          "250000": 5.9,
          "500000": 7.16,
          "1000000": 11.16
        }
      }
    }
  }
};
  if(typeof module!=="undefined")module.exports=root.TaxConfig;
})(globalThis);
