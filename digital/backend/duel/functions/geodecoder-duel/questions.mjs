// Server-only Duel content. Correct answer shapes and source IDs must never be
// returned wholesale to players or bundled into a Duel presentation payload.
// Generated once from the existing localized GeoDecoder bank, then audited against
// the six supplied PDFs. See digital/docs/DUEL_CONTENT_AUDIT.md. No runtime imports.
// Source pages are one-based; printedPages and pdfPages are deliberately separate.

function deepFreeze(value){
  if(value&&typeof value==='object'){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);}
  return value;
}

export const DUEL_SOURCES=deepFreeze({
  "D2": {
    "fileName": "DSKP KSSM MATEMATIK TINGKATAN 2.pdf",
    "form": 2,
    "kind": "curriculum",
    "language": "ms",
    "verified": true,
    "verifiedScope": "Chapter 6 only",
    "chapter": 6,
    "printedPages": [
      52,
      53,
      54
    ],
    "pdfPages": [
      64,
      65,
      66
    ]
  },
  "BM2": {
    "fileName": "Matematik Tingkatan 2 KSSM.pdf",
    "form": 2,
    "kind": "textbook",
    "language": "ms",
    "verified": true,
    "verifiedScope": "Chapter 6 sections 6.1–6.4 only",
    "chapter": 6,
    "printedPages": [
      98,
      99,
      100,
      101,
      102,
      103,
      104,
      105,
      106,
      107,
      108,
      109,
      110,
      111,
      112,
      113,
      114,
      115,
      116,
      117
    ],
    "pdfPages": [
      54,
      55,
      56,
      57,
      58,
      59,
      60,
      61,
      62,
      63
    ]
  },
  "EN2": {
    "fileName": "Mathematics Form 2 KSSM.pdf",
    "form": 2,
    "kind": "textbook",
    "language": "en",
    "verified": true,
    "verifiedScope": "Chapter 6 sections 6.1–6.4 only",
    "chapter": 6,
    "printedPages": [
      98,
      99,
      100,
      101,
      102,
      103,
      104,
      105,
      106,
      107,
      108,
      109,
      110,
      111,
      112,
      113,
      114,
      115,
      116,
      117
    ],
    "pdfPages": [
      54,
      55,
      56,
      57,
      58,
      59,
      60,
      61,
      62,
      63
    ]
  },
  "BM3": {
    "fileName": "Matematik Tingkatan 3 KSSM.pdf",
    "form": 3,
    "kind": "textbook",
    "language": "ms",
    "verified": true,
    "verifiedScope": "Contents and selected Chapter 7 sections 7.1–7.2 only; not covered by current Duel items",
    "chapter": 7,
    "printedPages": [
      170,
      171,
      182,
      183,
      184
    ],
    "pdfPages": [
      180,
      181,
      192,
      193,
      194
    ]
  },
  "EN3": {
    "fileName": "Mathematics Form 3 KSSM.pdf",
    "form": 3,
    "kind": "textbook",
    "language": "en",
    "verified": true,
    "verifiedScope": "Contents and selected Chapter 7 sections 7.1–7.2 only; not covered by current Duel items",
    "chapter": 7,
    "printedPages": [
      170,
      171,
      182,
      183,
      184
    ],
    "pdfPages": [
      180,
      181,
      192,
      193,
      194
    ]
  },
  "D3": {
    "fileName": "DSKP-KSSM-MATEMATIK-TINGKATAN-3.pdf",
    "form": 3,
    "kind": "curriculum",
    "language": "ms",
    "verified": true,
    "verifiedScope": "Chapter 7 only; not covered by current Duel items",
    "chapter": 7,
    "printedPages": [
      58,
      59,
      60
    ],
    "pdfPages": [
      70,
      71,
      72
    ]
  }
});

export const DUEL_QUESTIONS=deepFreeze({
  "P1": {
    "id": "P1",
    "shape": "pyramid",
    "topic": "properties",
    "copy": {
      "ms": {
        "prompt": "Bongkah apakah ini? Tapak segi empat sama dengan 4 muka segi tiga.",
        "lines": [
          "Bongkah apakah ini?",
          "Tapak segi empat sama dengan",
          "4 muka segi tiga."
        ],
        "hint": "Muka sisi akan bertemu pada puncak apabila dilipat."
      },
      "en": {
        "prompt": "Which solid is this? A square base with 4 triangular faces.",
        "lines": [
          "Which solid is this?",
          "A square base with",
          "4 triangular faces."
        ],
        "hint": "The side faces meet at an apex when folded."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.1.1",
          "alignment": "partial_support",
          "purpose": "Recognise a subset of solid properties; not full classification of every solid in the standard."
        },
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52
        ],
        "pdfPages": [
          64
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          100,
          101,
          102,
          103
        ],
        "pdfPages": [
          55,
          56
        ],
        "purpose": "Geometric properties and a square-based pyramid net."
      },
      {
        "id": "EN2",
        "printedPages": [
          100,
          101,
          102,
          103
        ],
        "pdfPages": [
          55,
          56
        ],
        "purpose": "Geometric properties and a square-based pyramid net."
      }
    ],
    "difficulty": {
      "level": "easy",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "P2": {
    "id": "P2",
    "shape": "pyramid",
    "topic": "formula",
    "copy": {
      "ms": {
        "prompt": "V=a^2*t/3; t=tinggi a=panjang sisi tapak segi empat sama Bongkah apakah ini?",
        "lines": [
          "V=a^2*t/3; t=tinggi",
          "a=panjang sisi tapak segi empat sama",
          "Bongkah apakah ini?"
        ],
        "hint": "a^2 ialah luas tapak. Fikir bentuk muka sisi bongkah."
      },
      "en": {
        "prompt": "V=a^2*t/3; t=height a=side length of the square base Which solid is this?",
        "lines": [
          "V=a^2*t/3; t=height",
          "a=side length of the square base",
          "Which solid is this?"
        ],
        "hint": "a^2 is the base area. Think about the solid’s side faces."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.4.1",
          "alignment": "partial_support",
          "purpose": "Recognise a volume formula; does not assess deriving it."
        },
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52,
          53
        ],
        "pdfPages": [
          64,
          65
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          103,
          111,
          113
        ],
        "pdfPages": [
          56,
          60,
          61
        ],
        "purpose": "Square-base net and one-third base-area-times-perpendicular-height volume relation."
      },
      {
        "id": "EN2",
        "printedPages": [
          103,
          111,
          113
        ],
        "pdfPages": [
          56,
          60,
          61
        ],
        "purpose": "Square-base net and one-third base-area-times-perpendicular-height volume relation."
      }
    ],
    "difficulty": {
      "level": "medium",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "P3": {
    "id": "P3",
    "shape": "pyramid",
    "topic": "net",
    "copy": {
      "ms": {
        "prompt": "Pilih bentangan bagi 1 segi empat sama dan 4 segi tiga.",
        "lines": [
          "Pilih bentangan bagi",
          "1 segi empat sama",
          "dan 4 segi tiga."
        ],
        "hint": "Lipat sisinya di sisi petak hingga bertemu di 1 puncak."
      },
      "en": {
        "prompt": "Choose the net with 1 square and 4 triangles.",
        "lines": [
          "Choose the net with",
          "1 square",
          "and 4 triangles."
        ],
        "hint": "Fold the triangles along the square’s sides until they meet at 1 apex."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52
        ],
        "pdfPages": [
          64
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          102,
          103,
          104
        ],
        "pdfPages": [
          56,
          57
        ],
        "purpose": "Valid nets and the square-based pyramid example."
      },
      {
        "id": "EN2",
        "printedPages": [
          102,
          103,
          104
        ],
        "pdfPages": [
          56,
          57
        ],
        "purpose": "Valid nets and the square-based pyramid example."
      }
    ],
    "difficulty": {
      "level": "easy",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "S1": {
    "id": "S1",
    "shape": "cylinder",
    "topic": "properties",
    "copy": {
      "ms": {
        "prompt": "Tin minuman ada dua tapak bulatan sama. Bongkah apakah ini?",
        "lines": [
          "Tin minuman ada dua",
          "tapak bulatan sama.",
          "Bongkah apakah ini?"
        ],
        "hint": "2 tapak bulatan sama saiz disambungkan oleh satu permukaan melengkung."
      },
      "en": {
        "prompt": "A drinks can has two equal circular bases. Which solid is this?",
        "lines": [
          "A drinks can has two",
          "equal circular bases.",
          "Which solid is this?"
        ],
        "hint": "Two circular bases of the same size are joined by a curved surface."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.1.1",
          "alignment": "partial_support",
          "purpose": "Recognise a subset of solid properties; not full classification of every solid in the standard."
        },
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52
        ],
        "pdfPages": [
          64
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          101,
          103
        ],
        "pdfPages": [
          55,
          56
        ],
        "purpose": "Congruent circular bases, curved surface and a right-cylinder net."
      },
      {
        "id": "EN2",
        "printedPages": [
          101,
          103
        ],
        "pdfPages": [
          55,
          56
        ],
        "purpose": "Congruent circular bases, curved surface and a right-cylinder net."
      }
    ],
    "difficulty": {
      "level": "easy",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "S2": {
    "id": "S2",
    "shape": "cylinder",
    "topic": "formula",
    "copy": {
      "ms": {
        "prompt": "V=pi*j^2*t L=2*pi*j*(j+t) Bongkah apakah ini?",
        "lines": [
          "V=pi*j^2*t",
          "L=2*pi*j*(j+t)",
          "Bongkah apakah ini?"
        ],
        "hint": "j=jejari dan t=tinggi. Tapak atas dan bawah sama saiz."
      },
      "en": {
        "prompt": "V=pi*j^2*t L=2*pi*j*(j+t) Which solid is this?",
        "lines": [
          "V=pi*j^2*t",
          "L=2*pi*j*(j+t)",
          "Which solid is this?"
        ],
        "hint": "j=radius and t=height. The top and bottom bases are the same size."
      }
    },
    "formulaKey": {
      "ms": "V = isi padu · L = luas permukaan · j = jejari · t = tinggi",
      "en": "V = volume · L = surface area · j = radius · t = height"
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.3.1",
          "alignment": "partial_support",
          "purpose": "Recognise a surface-area formula; does not assess deriving it or calculating an area."
        },
        {
          "code": "6.4.1",
          "alignment": "partial_support",
          "purpose": "Recognise a volume formula; does not assess deriving it."
        },
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52,
          53
        ],
        "pdfPages": [
          64,
          65
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          103,
          105,
          111,
          113
        ],
        "pdfPages": [
          56,
          57,
          60,
          61
        ],
        "purpose": "Closed right-cylinder net, total surface area and volume formulas."
      },
      {
        "id": "EN2",
        "printedPages": [
          103,
          105,
          111,
          113
        ],
        "pdfPages": [
          56,
          57,
          60,
          61
        ],
        "purpose": "Closed right-cylinder net, total surface area and volume formulas."
      }
    ],
    "difficulty": {
      "level": "medium",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "S3": {
    "id": "S3",
    "shape": "cylinder",
    "topic": "net",
    "copy": {
      "ms": {
        "prompt": "Pilih bentangan: 2 bulatan sama saiz, 1 segi empat tepat.",
        "lines": [
          "Pilih bentangan:",
          "2 bulatan sama saiz,",
          "1 segi empat tepat."
        ],
        "hint": "Lengkungkan segi empat itu; dua bulatan jadi tapak."
      },
      "en": {
        "prompt": "Choose the net: 2 circles of the same size, 1 rectangle.",
        "lines": [
          "Choose the net:",
          "2 circles of the same size,",
          "1 rectangle."
        ],
        "hint": "Curve the rectangle; the two circles become the bases."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52
        ],
        "pdfPages": [
          64
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          103,
          105
        ],
        "pdfPages": [
          56,
          57
        ],
        "purpose": "Right-cylinder net with two congruent circles and a rectangle."
      },
      {
        "id": "EN2",
        "printedPages": [
          103,
          105
        ],
        "pdfPages": [
          56,
          57
        ],
        "purpose": "Right-cylinder net with two congruent circles and a rectangle."
      }
    ],
    "difficulty": {
      "level": "easy",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "K1": {
    "id": "K1",
    "shape": "cube",
    "topic": "properties",
    "copy": {
      "ms": {
        "prompt": "Enam muka berbentuk segi empat sama. Bongkah apakah ini?",
        "lines": [
          "Enam muka berbentuk",
          "segi empat sama.",
          "Bongkah apakah ini?"
        ],
        "hint": "12 tepi sama panjang. Setiap muka sama bentuk dan saiz."
      },
      "en": {
        "prompt": "Six faces in the shape of squares. Which solid is this?",
        "lines": [
          "Six faces in the shape",
          "of squares.",
          "Which solid is this?"
        ],
        "hint": "12 edges of equal length. Every face has the same shape and size."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.1.1",
          "alignment": "partial_support",
          "purpose": "Recognise a subset of solid properties; not full classification of every solid in the standard."
        },
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52
        ],
        "pdfPages": [
          64
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          100,
          101,
          102,
          104,
          105
        ],
        "pdfPages": [
          55,
          56,
          57
        ],
        "purpose": "Prism/cube properties, cube-net exploration and six square faces."
      },
      {
        "id": "EN2",
        "printedPages": [
          100,
          101,
          102,
          104,
          105
        ],
        "pdfPages": [
          55,
          56,
          57
        ],
        "purpose": "Prism/cube properties, cube-net exploration and six square faces."
      }
    ],
    "difficulty": {
      "level": "easy",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "K2": {
    "id": "K2",
    "shape": "cube",
    "topic": "formula",
    "copy": {
      "ms": {
        "prompt": "V=a^3; L=6*a^2 a=panjang tepi Bongkah apakah ini?",
        "lines": [
          "V=a^3; L=6*a^2",
          "a=panjang tepi",
          "Bongkah apakah ini?"
        ],
        "hint": "Panjang, lebar serta tinggi sama bagi bongkah ini."
      },
      "en": {
        "prompt": "V=a^3; L=6*a^2 a=edge length Which solid is this?",
        "lines": [
          "V=a^3; L=6*a^2",
          "a=edge length",
          "Which solid is this?"
        ],
        "hint": "The length, width and height of this solid are equal."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.3.1",
          "alignment": "partial_support",
          "purpose": "Recognise a surface-area formula; does not assess deriving it or calculating an area."
        },
        {
          "code": "6.4.1",
          "alignment": "partial_support",
          "purpose": "Recognise a volume formula; does not assess deriving it."
        },
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52,
          53
        ],
        "pdfPages": [
          64,
          65
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          102,
          104,
          105,
          107,
          111
        ],
        "pdfPages": [
          56,
          57,
          58,
          60
        ],
        "purpose": "Cube surface area and cube volume as the equal-edge specialization of length × width × height."
      },
      {
        "id": "EN2",
        "printedPages": [
          102,
          104,
          105,
          107,
          111
        ],
        "pdfPages": [
          56,
          57,
          58,
          60
        ],
        "purpose": "Cube surface area and cube volume as the equal-edge specialization of length × width × height."
      }
    ],
    "difficulty": {
      "level": "medium",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "K3": {
    "id": "K3",
    "shape": "cube",
    "topic": "net",
    "copy": {
      "ms": {
        "prompt": "Pilih bentangan: 6 segi empat sama, semuanya sama saiz.",
        "lines": [
          "Pilih bentangan:",
          "6 segi empat sama,",
          "semuanya sama saiz."
        ],
        "hint": "Bayangkan muka dilipat jadi kotak tanpa muka bertindih"
      },
      "en": {
        "prompt": "Choose the net: 6 squares, all the same size.",
        "lines": [
          "Choose the net:",
          "6 squares,",
          "all the same size."
        ],
        "hint": "Imagine folding the faces into a box without any faces overlapping."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52
        ],
        "pdfPages": [
          64
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          102,
          103,
          104,
          105
        ],
        "pdfPages": [
          56,
          57
        ],
        "purpose": "Cube-net exploration and six square faces; only the valid supplied arrangement is assessed."
      },
      {
        "id": "EN2",
        "printedPages": [
          102,
          103,
          104,
          105
        ],
        "pdfPages": [
          56,
          57
        ],
        "purpose": "Cube-net exploration and six square faces; only the valid supplied arrangement is assessed."
      }
    ],
    "difficulty": {
      "level": "easy",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "C1": {
    "id": "C1",
    "shape": "cone",
    "topic": "formula",
    "copy": {
      "ms": {
        "prompt": "V=pi*j^2*t/3 j=jejari; t=tinggi. Bongkah apakah ini?",
        "lines": [
          "V=pi*j^2*t/3",
          "j=jejari; t=tinggi.",
          "Bongkah apakah ini?"
        ],
        "hint": "Lihat tapaknya yang bulat. Permukaan melengkungnya mengecil ke puncak."
      },
      "en": {
        "prompt": "V=pi*j^2*t/3 j=radius; t=height. Which solid is this?",
        "lines": [
          "V=pi*j^2*t/3",
          "j=radius; t=height.",
          "Which solid is this?"
        ],
        "hint": "Look at its circular base. Its curved surface narrows to an apex."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.4.1",
          "alignment": "partial_support",
          "purpose": "Recognise a volume formula; does not assess deriving it."
        },
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52,
          53
        ],
        "pdfPages": [
          64,
          65
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          103,
          112,
          113
        ],
        "pdfPages": [
          56,
          61
        ],
        "purpose": "Cone net and one-third circular-base-area-times-perpendicular-height volume relation."
      },
      {
        "id": "EN2",
        "printedPages": [
          103,
          112,
          113
        ],
        "pdfPages": [
          56,
          61
        ],
        "purpose": "Cone net and one-third circular-base-area-times-perpendicular-height volume relation."
      }
    ],
    "difficulty": {
      "level": "medium",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "C2": {
    "id": "C2",
    "shape": "cone",
    "topic": "formula",
    "copy": {
      "ms": {
        "prompt": "L=pi*j*(j+s) j=jejari; s=tinggi sendeng. Bentuk apa?",
        "lines": [
          "L=pi*j*(j+s)",
          "j=jejari; s=tinggi",
          "sendeng. Bentuk apa?"
        ],
        "hint": "Tinggi sendeng diukur dari tepi tapak ke puncak di sepanjang garis lurus pada permukaan melengkung."
      },
      "en": {
        "prompt": "L=pi*j*(j+s) j=radius; s=slant height. Which shape is it?",
        "lines": [
          "L=pi*j*(j+s)",
          "j=radius; s=slant",
          "height. Which shape is it?"
        ],
        "hint": "The slant height is measured along a straight line on the curved surface from the base edge to the apex."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.3.1",
          "alignment": "partial_support",
          "purpose": "Recognise a surface-area formula; does not assess deriving it or calculating an area."
        },
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52
        ],
        "pdfPages": [
          64
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          103,
          106,
          109
        ],
        "pdfPages": [
          56,
          58,
          59
        ],
        "purpose": "Closed-cone net and total surface area; perpendicular height differs from slant height."
      },
      {
        "id": "EN2",
        "printedPages": [
          103,
          106,
          109
        ],
        "pdfPages": [
          56,
          58,
          59
        ],
        "purpose": "Closed-cone net and total surface area; perpendicular height differs from slant height."
      }
    ],
    "difficulty": {
      "level": "medium",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "C3": {
    "id": "C3",
    "shape": "cone",
    "topic": "net",
    "copy": {
      "ms": {
        "prompt": "Pilih bentangan yang ada 1 sektor bulatan dan 1 bulatan.",
        "lines": [
          "Pilih bentangan yang",
          "ada 1 sektor bulatan",
          "dan 1 bulatan."
        ],
        "hint": "Rapatkan sisi lurus pada sektor. Bulatan jadi tapak."
      },
      "en": {
        "prompt": "Choose the net with 1 sector of a circle and 1 circle.",
        "lines": [
          "Choose the net with",
          "1 sector of a circle",
          "and 1 circle."
        ],
        "hint": "Join the straight sides of the sector. The circle becomes the base."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52
        ],
        "pdfPages": [
          64
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          103,
          106
        ],
        "pdfPages": [
          56,
          58
        ],
        "purpose": "Cone net with a circular sector and a circular base, including arc/circumference relation."
      },
      {
        "id": "EN2",
        "printedPages": [
          103,
          106
        ],
        "pdfPages": [
          56,
          58
        ],
        "purpose": "Cone net with a circular sector and a circular base, including arc/circumference relation."
      }
    ],
    "difficulty": {
      "level": "easy",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "B1": {
    "id": "B1",
    "shape": "cuboid",
    "topic": "properties",
    "copy": {
      "ms": {
        "prompt": "Dalam contoh ini, kotak ada 3 ukuran yang tidak sama. Bongkah apakah ini?",
        "lines": [
          "Dalam contoh ini, kotak ada",
          "3 ukuran yang tidak sama.",
          "Bongkah apakah ini?"
        ],
        "hint": "Perhatikan panjang, lebar serta tinggi kotak contoh ini. Muka berhadapan sama bentuk dan saiz."
      },
      "en": {
        "prompt": "In this example, the box has 3 dimensions of different lengths. Which solid is this?",
        "lines": [
          "In this example, the box has",
          "3 dimensions of different lengths.",
          "Which solid is this?"
        ],
        "hint": "Look at the length, width and height of this example. Opposite faces are congruent."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.1.1",
          "alignment": "partial_support",
          "purpose": "Recognise a subset of solid properties; not full classification of every solid in the standard."
        },
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52
        ],
        "pdfPages": [
          64
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          100,
          101,
          102,
          104,
          107
        ],
        "pdfPages": [
          55,
          56,
          57,
          58
        ],
        "purpose": "Cuboid/prism properties, valid nets and an example showing that two cuboid dimensions may also be equal."
      },
      {
        "id": "EN2",
        "printedPages": [
          100,
          101,
          102,
          104,
          107
        ],
        "pdfPages": [
          55,
          56,
          57,
          58
        ],
        "purpose": "Cuboid/prism properties, valid nets and an example showing that two cuboid dimensions may also be equal."
      }
    ],
    "difficulty": {
      "level": "easy",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "B2": {
    "id": "B2",
    "shape": "cuboid",
    "topic": "formula",
    "copy": {
      "ms": {
        "prompt": "V=p*l*t; dalam contoh ini, p,l,t ialah 3 ukuran berbeza. Bongkah apakah ini?",
        "lines": [
          "V=p*l*t; dalam contoh ini,",
          "p,l,t ialah 3 ukuran berbeza.",
          "Bongkah apakah ini?"
        ],
        "hint": "p=panjang, l=lebar, t=tinggi. Lihat kotak kasut."
      },
      "en": {
        "prompt": "V=p*l*t; in this example, p,l,t are 3 different dimensions. Which solid is this?",
        "lines": [
          "V=p*l*t; in this example,",
          "p,l,t are 3 different dimensions.",
          "Which solid is this?"
        ],
        "hint": "p=length, l=width, t=height. Think of a shoe box."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.4.1",
          "alignment": "partial_support",
          "purpose": "Recognise a volume formula; does not assess deriving it."
        },
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52,
          53
        ],
        "pdfPages": [
          64,
          65
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          102,
          104,
          111
        ],
        "pdfPages": [
          56,
          57,
          60
        ],
        "purpose": "Cuboid volume formula and supplied net; different dimensions describe this item’s example only."
      },
      {
        "id": "EN2",
        "printedPages": [
          102,
          104,
          111
        ],
        "pdfPages": [
          56,
          57,
          60
        ],
        "purpose": "Cuboid volume formula and supplied net; different dimensions describe this item’s example only."
      }
    ],
    "difficulty": {
      "level": "medium",
      "basis": "team_estimate",
      "studentValidated": false
    }
  },
  "B3": {
    "id": "B3",
    "shape": "cuboid",
    "topic": "net",
    "copy": {
      "ms": {
        "prompt": "Kotak: 6cm x 4cm dengan tinggi 3cm. Pilih bentangannya.",
        "lines": [
          "Kotak: 6cm x 4cm",
          "dengan tinggi 3cm.",
          "Pilih bentangannya."
        ],
        "hint": "Padankan muka yang sama saiz, lalu lipat menjadi kotak."
      },
      "en": {
        "prompt": "A box: 6cm x 4cm with a height of 3cm. Choose its net.",
        "lines": [
          "A box: 6cm x 4cm",
          "with a height of 3cm.",
          "Choose its net."
        ],
        "hint": "Match the faces of the same size, then fold them into a box."
      }
    },
    "curriculum": {
      "form": 2,
      "chapter": 6,
      "learningStandards": [
        {
          "code": "6.2.1",
          "alignment": "partial_support",
          "purpose": "Match a valid supplied net; does not assess drawing a net or constructing a model."
        }
      ]
    },
    "sources": [
      {
        "id": "D2",
        "printedPages": [
          52
        ],
        "pdfPages": [
          64
        ],
        "purpose": "Verified learning-standard alignment; recognition/matching supports only part of each standard."
      },
      {
        "id": "BM2",
        "printedPages": [
          102,
          103,
          104,
          107
        ],
        "pdfPages": [
          56,
          57,
          58
        ],
        "purpose": "Net construction and paired rectangular faces. The 6 cm × 4 cm × 3 cm dimensions are an existing GeoDecoder example, not a copied textbook question."
      },
      {
        "id": "EN2",
        "printedPages": [
          102,
          103,
          104,
          107
        ],
        "pdfPages": [
          56,
          57,
          58
        ],
        "purpose": "Net construction and paired rectangular faces. The 6 cm × 4 cm × 3 cm dimensions are an existing GeoDecoder example, not a copied textbook question."
      }
    ],
    "difficulty": {
      "level": "easy_to_medium",
      "basis": "team_estimate",
      "studentValidated": false
    }
  }
});
