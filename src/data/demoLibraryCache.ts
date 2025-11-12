export interface DemoTrackMeta {
  trackId: string
  title: string
  artist: string
  available: boolean
  tempo: number
  energy: number
  valence: number
}

interface DemoLikeEntry {
  trackId: string
  addedAt: number
}

const demoTracks: DemoTrackMeta[] = [
//   {
//     trackId: '3Vd4fHzwS6pBS3muymjiDi',
//     title: 'Let Alone The One You Love',
//     artist: 'Olivia Dean',
//     available: true,
//     tempo: 82.269,
//     energy: 0.423,
//     valence: 0.312
//   },
//   {
//     trackId: '6sGIMrtIzQjdzNndVxe397',
//     title: 'So Easy (To Fall In Love)',
//     artist: 'Olivia Dean',
//     available: true,
//     tempo: 139.898,
//     energy: 0.633,
//     valence: 0.572
//   },
//   {
//     trackId: '5AKfkVoqjbksuQ7OBcK7eo',
//     title: 'さよならはエモーション',
//     artist: 'sakanaction',
//     available: true,
//     tempo: 162.039,
//     energy: 0.743,
//     valence: 0.469
//   },
//   {
//     trackId: '6e6ngB70V7X4NFGP7vN1ic',
//     title: 'Penny',
//     artist: 'Okonski',
//     available: true,
//     tempo: 66.094,
//     energy: 0.237,
//     valence: 0.549
//   },
//   {
//     trackId: '29ZBUEAIGJUfutb7YCkOiO',
//     title: 'Field Museum',
//     artist: 'Okonski',
//     available: true,
//     tempo: 99.591,
//     energy: 0.164,
//     valence: 0.314
//   },
//   {
//     trackId: '3gnWvEHvlaNb3DecldAs33',
//     title: '17 Thunder',
//     artist: 'Gianni Brezzo',
//     available: true,
//     tempo: 77.018,
//     energy: 0.387,
//     valence: 0.417
//   },
//   {
//     trackId: '2uWyRgo5ILEKxozm92t2ob',
//     title: 'Mammone',
//     artist: 'Rachel Kitchlew;SFJ;SHOLTO;David Bardon',
//     available: true,
//     tempo: 138.298,
//     energy: 0.463,
//     valence: 0.218
//   },
//   {
//     trackId: '0Z8Deaa7KsxIqWOEWoTFo1',
//     title: 'Plage des Casernes - In Session',
//     artist: 'The Offline',
//     available: true,
//     tempo: 77.086,
//     energy: 0.301,
//     valence: 0.36
//   },
//   {
//     trackId: '7xzqgS9xNlvZi2AZvGBa7m',
//     title: 'Lakebridge',
//     artist: 'Okonski',
//     available: true,
//     tempo: 79.989,
//     energy: 0.558,
//     valence: 0.297
//   },
//   {
//     trackId: '6F8R48yp2MwKOCONQgEMzw',
//     title: 'himno de verano - House Edit',
//     artist: 'Marlon Funaki',
//     available: true,
//     tempo: 109.502,
//     energy: 0.348,
//     valence: 0.374
//   },
//   {
//     trackId: '6WnWNaP97gqu4Zr1bPZeE7',
//     title: 'JoyRide',
//     artist: 'HolyBrune;Dabeull;Rude Jude',
//     available: true,
//     tempo: 107.997,
//     energy: 0.653,
//     valence: 0.534
//   },
//   {
//     trackId: '3Pafvx9caYw7m4e0lyWgBl',
//     title: 'Hotel View',
//     artist: 'Dabeull;Sofiane Pamart;HolyBrune',
//     available: true,
//     tempo: 124.073,
//     energy: 0.283,
//     valence: 0.419
//   },
//   {
//     trackId: '7bvkBpcJnYHCuiyoDk9t3l',
//     title: 'The Message [Tablet I]',
//     artist: 'Blood Incantation',
//     available: true,
//     tempo: 104.087,
//     energy: 0.918,
//     valence: 0.15
//   },
//   {
//     trackId: '0jr6tT2vc4cIFPHb6wufG3',
//     title: 'Promise (feat. Usher)',
//     artist: 'Romeo Santos;USHER',
//     available: true,
//     tempo: 132.995,
//     energy: 0.739,
//     valence: 0.77
//   },
//   {
//     trackId: '0PWtb8aCf6vVudatSVUSst',
//     title: 'Atmosphere',
//     artist: 'The Colours That Rise;Yazmin Lacey',
//     available: true,
//     tempo: 86.019,
//     energy: 0.328,
//     valence: 0.835
//   },
//   {
//     trackId: '7ms6jXUWNRbmZzTBlJwZef',
//     title: 'Art Of Getting By',
//     artist: 'RUBII',
//     available: true,
//     tempo: 142.942,
//     energy: 0.446,
//     valence: 0.485
//   },
//   {
//     trackId: '0jXiHFeSflfTiQtezpFMwn',
//     title: 'Woodsong',
//     artist: 'MAXN',
//     available: true,
//     tempo: 87.993,
//     energy: 0.541,
//     valence: 0.956
//   },
//   {
//     trackId: '5mSoqzA0VoYLfXZ1FDo36S',
//     title: 'We Are Not Perfect',
//     artist: 'Alex Stalart',
//     available: true,
//     tempo: 95.019,
//     energy: 0.642,
//     valence: 0.585
//   },
//   {
//     trackId: '3R8IbTKkaFHqK2AE1CJmQu',
//     title: 'You Tonight',
//     artist: 'Tullio',
//     available: true,
//     tempo: 119.995,
//     energy: 0.549,
//     valence: 0.37
//   },
//   {
//     trackId: '2HsRSiAFubcJaeQJ9pttC9',
//     title: 'We All Need One Another',
//     artist: 'Stylus',
//     available: true,
//     tempo: 127.063,
//     energy: 0.584,
//     valence: 0.88
//   },
//   {
//     trackId: '278ppB9nzHsAAazgjAT313',
//     title: 'Velvet Drive',
//     artist: 'Funkorama',
//     available: true,
//     tempo: 113.108,
//     energy: 0.424,
//     valence: 0.855
//   },
//   {
//     trackId: '43jjp5s4gbwoCmBQQczKbo',
//     title: 'Rumour',
//     artist: 'Qendresa',
//     available: true,
//     tempo: 79.781,
//     energy: 0.466,
//     valence: 0.708
//   },
//   {
//     trackId: '7IerUPqxU6Fp69S9UDCOQm',
//     title: 'Time',
//     artist: 'Kartell;Qendresa;Coops',
//     available: true,
//     tempo: 150.876,
//     energy: 0.581,
//     valence: 0.779
//   },
//   {
//     trackId: '709ZIqPHyFOpx2QdjmeWAM',
//     title: 'Dracula',
//     artist: 'Tame Impala',
//     available: true,
//     tempo: 114.837,
//     energy: 0.731,
//     valence: 0.612
//   },
//   {
//     trackId: '3KH7W2zKlPHeLc2dS9UQe4',
//     title: 'MIAMI',
//     artist: 'Tommy Richman',
//     available: true,
//     tempo: 172.043,
//     energy: 0.662,
//     valence: 0.684
//   },
//   {
//     trackId: '5Pxw4MqAFpXufdGhnAmYgI',
//     title: 'Primrose (feat. Naisha)',
//     artist: 'NATE08;Naisha',
//     available: true,
//     tempo: 115.02,
//     energy: 0.415,
//     valence: 0.492
//   },
//   {
//     trackId: '1dyA1Re4QEQQWGDDT7h9TK',
//     title: 'Flores',
//     artist: 'LATIN MAFIA',
//     available: true,
//     tempo: 192.051,
//     energy: 0.4,
//     valence: 0.0738
//   },
//   {
//     trackId: '128I36bDgYHU9l2QcgEGcd',
//     title: 'Love Between...',
//     artist: 'Kali Uchis',
//     available: true,
//     tempo: 130.919,
//     energy: 0.404,
//     valence: 0.465
//   },
//   {
//     trackId: '3Q3kB5uskRw5o1ffwFO3G0',
//     title: 'Come With Me',
//     artist: 'Chloe Bodur',
//     available: true,
//     tempo: 118.88,
//     energy: 0.434,
//     valence: 0.268
//   },
//   {
//     trackId: '45QBDwd7BCdqCpxSj4N9tm',
//   title: "Mansur's Interlude",
//     artist: 'Ojerime',
//     available: true,
//     tempo: 118.044,
//     energy: 0.308,
//     valence: 0.0677
//   },
//   {
//     trackId: '7C2uY2KCfOW3PzCCfWDERA',
//     title: 'seems like time moves forever.',
//     artist: 'Tommy Richman;mynameisntjmack',
//     available: true,
//     tempo: 115.033,
//     energy: 0.737,
//     valence: 0.104
//   },
//   {
//     trackId: '119MQfBVx1XVcB4q9PlnJW',
//     title: 'numbersnshit',
//     artist: 'mynameisntjmack;Tommy Richman',
//     available: true,
//     tempo: 117.98,
//     energy: 0.623,
//     valence: 0.609
//   },
//   {
//     trackId: '5RHhmGMV3FKxRa63AIfIgZ',
//     title: 'Another Stone',
//     artist: 'Men I Trust',
//     available: true,
//     tempo: 89.016,
//     energy: 0.445,
//     valence: 0.707
//   },
//   {
//     trackId: '3dSZcr7SWwFdOmY0r3Ryih',
//     title: 'Be Mine',
//     artist: 'Qendresa',
//     available: true,
//     tempo: 156.936,
//     energy: 0.642,
//     valence: 0.63
//   },
//   {
//     trackId: '7dfjkwagedO9FLbjUXRAZE',
//     title: 'Dedicate All My Love',
//     artist: 'Raw Soul Express',
//     available: true,
//     tempo: 137.655,
//     energy: 0.444,
//     valence: 0.336
//   },
//   {
//     trackId: '3WL8kYh2pIdT0C0h2drfPf',
//     title: 'LMK',
//     artist: 'Qendresa',
//     available: true,
//     tempo: 92.773,
//     energy: 0.644,
//     valence: 0.804
//   },
//   {
//     trackId: '0RyekuZ6N0SkpokVwkVnbg',
//     title: 'ok//wassup',
//     artist: 'shaw00p;JBA',
//     available: true,
//     tempo: 132.008,
//     energy: 0.68,
//     valence: 0.207
//   },
//   {
//     trackId: '6KafcmIAnIcYOA1Qppfurb',
//     title: 'Forgive & Forget',
//     artist: 'RUBII',
//     available: true,
//     tempo: 135.951,
//     energy: 0.703,
//     valence: 0.767
//   },
//   {
//     trackId: '02A70z86yAU41b21L516v7',
//     title: 'giving',
//     artist: 'GIOVANNA;Austin Marc',
//     available: true,
//     tempo: 102.034,
//     energy: 0.365,
//     valence: 0.484
//   },
//   {
//     trackId: '77lKjGkhvWuimTzQxA4STK',
//     title: 'Lovers Rock',
//     artist: 'Sade',
//     available: true,
//     tempo: 145.855,
//     energy: 0.447,
//     valence: 0.78
//   },
//   {
//     trackId: '2K6Nk2bR9xPE39EY9mARVa',
//     title: 'Sweet Lies',
//     artist: 'Qendresa',
//     available: true,
//     tempo: 158.035,
//     energy: 0.632,
//     valence: 0.863
//   },
//   {
//     trackId: '29x8z6fxeHdVTc0P3rhv10',
//     title: 'Heat of the Moon',
//     artist: 'ELIZA',
//     available: true,
//     tempo: 126.018,
//     energy: 0.203,
//     valence: 0.432
//   },
//   {
//     trackId: '3X7wVYr4XpzGgoXmQVnrJo',
//     title: 'Give It Up 2 Me',
//     artist: 'Ojerime',
//     available: true,
//     tempo: 134.406,
//     energy: 0.411,
//     valence: 0.165
//   },
//   {
//     trackId: '5N2cPHhndfHTfrTjPOjvJe',
//     title: 'Love or Lust (Intro)',
//     artist: 'Qendresa',
//     available: true,
//     tempo: 77.917,
//     energy: 0.692,
//     valence: 0.226
//   },
//   {
//     trackId: '0nYYKcUcjOqg21Di98ubDc',
//     title: 'The Bounce',
//     artist: 'Qendresa',
//     available: true,
//     tempo: 76.382,
//     energy: 0.795,
//     valence: 0.694
//   },
//   {
//     trackId: '3z0JwddAR5GASTxnKExIw1',
//     title: "joycelyn's dance",
//     artist: 'berlioz',
//     available: true,
//     tempo: 113.995,
//     energy: 0.503,
//     valence: 0.381
//   },
//   {
//     trackId: '4aptr0Era7aIdkX5gfsaFN',
//     title: 'ode to rahsaan',
//     artist: 'berlioz',
//     available: true,
//     tempo: 119.005,
//     energy: 0.626,
//     valence: 0.524
//   },
//   {
//     trackId: '3YbFagT5wCU8M9xLdVID4j',
//     title: 'nyc in 1940',
//     artist: 'berlioz;Ted Jasper',
//     available: true,
//     tempo: 116.998,
//     energy: 0.482,
//     valence: 0.585
//   },
//   {
//     trackId: '2OxidMKQ4V3V9XIofZIm7L',
//     title: 'More Time',
//     artist: 'Chaos In The CBD;Lee Pearson Jr. Collective',
//     available: true,
//     tempo: 115.021,
//     energy: 0.676,
//     valence: 0.72
//   },
//   {
//     trackId: '1VNZ7LWT495ICAO4CvOaTX',
//     title: 'DX7 - Indastudio 10',
//     artist: 'Dabeull;HolyBrune',
//     available: true,
//     tempo: 110.984,
//     energy: 0.586,
//     valence: 0.723
//   },
//   {
//     trackId: '2cgHekIPyuKxEEcV72tuy4',
//     title: 'Live For You',
//     artist: 'Thee Sacred Souls',
//     available: true,
//     tempo: 98.855,
//     energy: 0.795,
//     valence: 0.884
//   },
//   {
//     trackId: '5KQ6jVizgxjd2XBn8qKKCh',
//     title: "Let's Play",
//     artist: 'Dabeull;HolyBrune;Dezzy Hollow',
//     available: true,
//     tempo: 102.974,
//     energy: 0.612,
//     valence: 0.545
//   },
//   {
//     trackId: '3mU588Di5vqL2w3d3J2dJd',
//     title: 'Catching Feelings',
//     artist: 'HolyBrune;Dabeull',
//     available: true,
//     tempo: 103.948,
//     energy: 0.443,
//     valence: 0.562
//   },
//   {
//     trackId: '47yngLaqEr3z1lnk7ok0OV',
//     title: 'Selenge',
//     artist: 'Céline Dessberg',
//     available: true,
//     tempo: 90.234,
//     energy: 0.641,
//     valence: 0.722
//   },
//   {
//     trackId: '5mxyCS71pwJP71GOGNTyFE',
//     title: 'Dark Moon',
//     artist: 'Okonski',
//     available: true,
//     tempo: 149.218,
//     energy: 0.306,
//     valence: 0.0562
//   },
//   {
//     trackId: '3hmCHZFkgE4tkJKSqpOUhz',
//     title: 'Black Classical Music (feat. Venna & Charlie Stacey)',
//     artist: 'Yussef Dayes;Venna;Charlie Stacey',
//     available: true,
//     tempo: 155.07,
//     energy: 0.689,
//     valence: 0.502
//   },
//   {
//     trackId: '3AH0jj54A0BNMOXz34neIB',
//     title: 'Sometimes (feat. Future)',
//     artist: 'Gucci Mane;Future',
//     available: true,
//     tempo: 142.461,
//     energy: 0.459,
//     valence: 0.33
//   },
//   {
//     trackId: '3haDFkQVqexHwwxVNU5BHh',
//     title: 'Never Forget',
//     artist: 'Future',
//     available: true,
//     tempo: 149.951,
//     energy: 0.501,
//     valence: 0.185
//   },
//   {
//     trackId: '5P6ByN1elQzHH66vKlAB9a',
//     title: 'Understand Me',
//     artist: 'Chief Keef;Jeezy',
//     available: true,
//     tempo: 137.948,
//     energy: 0.64,
//     valence: 0.355
//   },
//   {
//     trackId: '2YtTNxvA5PeUWMq3JSEmJQ',
//     title: 'Dusk',
//     artist: 'Okonski',
//     available: true,
//     tempo: 123.892,
//     energy: 0.332,
//     valence: 0.478
//   },
//   {
//     trackId: '0Qp66EJS2DalnLkRKmu7mX',
//     title: 'Summer Storm',
//     artist: 'Okonski',
//     available: true,
//     tempo: 84.305,
//     energy: 0.587,
//     valence: 0.458
//   },
//   {
//     trackId: '25Lz9RaOo8sVH34BoDqCJR',
//     title: 'Sucks On Dick (feat. Juicy J)',
//     artist: 'Project Pat;Juicy J',
//     available: true,
//     tempo: 151.941,
//     energy: 0.533,
//     valence: 0.454
//   },
//   {
//     trackId: '1Ms8SsQJiTJ3zEMosUWkUR',
//     title: "Rinky Dink II/We're Gonna Rumble",
//     artist: 'Project Pat',
//     available: true,
//     tempo: 148.028,
//     energy: 0.473,
//     valence: 0.775
//   },
//   {
//     trackId: '0ZxdL5vV2jV4rfiZg2v76T',
//     title: 'Rinky Dink/Whatever Ho (feat. Hypnotize Camp Posse)',
//     artist: 'Project Pat;Hypnotize Camp Posse',
//     available: true,
//     tempo: 158.059,
//     energy: 0.711,
//     valence: 0.556
//   },
//   {
//     trackId: '0NZwAPRO1DqSAprpZHnBiE',
//     title: 'You Know the Biss (feat. Project Pat)',
//     artist: 'DJ Paul;Project Pat',
//     available: true,
//     tempo: 166.048,
//     energy: 0.49,
//     valence: 0.713
//   },
//   {
//     trackId: '5KQNhnUSvG8VSs24qEoSu9',
//     title: 'North Memphis',
//     artist: 'Project Pat',
//     available: true,
//     tempo: 76.98,
//     energy: 0.691,
//     valence: 0.383
//   },
//   {
//     trackId: '6ibvxqNzzrEvIuF4oDDgGs',
//     title: '(BONUS) LIGHT REFLECTS OFF THE SPEAR',
//     artist: 'BBY GOYARD;Egobreak',
//     available: true,
//     tempo: 78.983,
//     energy: 0.843,
//     valence: 0.57
//   },
//   {
//     trackId: '3nd4JyjkxQodjjvQd5Gmgd',
//     title: 'Wind Or Vertigo',
//     artist: 'Okonski',
//     available: true,
//     tempo: 137.095,
//     energy: 0.251,
//     valence: 0.371
//   },
//   {
//     trackId: '5fDDQmf4HaV848CIyrP2vl',
//     title: 'ENTRE NOSOTROS',
//     artist: 'Junior H',
//     available: true,
//     tempo: 124.92,
//     energy: 0.689,
//     valence: 0.909
//   },
//   {
//     trackId: '1g93upxwFhq1vg0OPYTq2r',
//     title: 'Jugg',
//     artist: 'Young Nudy',
//     available: true,
//     tempo: 157.137,
//     energy: 0.679,
//     valence: 0.663
//   },
//   {
//     trackId: '4PNii2qmrTZD0fzQ7gr0UT',
//     title: 'あなたは煙草　私はシャボン',
//     artist: 'Lovely Summer Chan',
//     available: true,
//     tempo: 115.028,
//     energy: 0.664,
//     valence: 0.547
//   },
//   {
//     trackId: '1fbMGnVgmS72f4CUWnPTMU',
//     title: 'Kawasaki Drift',
//     artist: 'BAD HOP',
//     available: true,
//     tempo: 176.02,
//     energy: 0.681,
//     valence: 0.331
//   },
//   {
//     trackId: '0XZyF9lv6diMt4bxThOL0h',
//     title: '勿忘',
//     artist: 'Awesome City Club',
//     available: true,
//     tempo: 78.861,
//     energy: 0.447,
//     valence: 0.299
//   },
//   {
//     trackId: '6lRJqlbbsSAyoN67hVsF8A',
//     title: 'Leave',
//     artist: 'Whirr',
//     available: true,
//     tempo: 95.057,
//     energy: 0.692,
//     valence: 0.209
//   },
//   {
//     trackId: '2q7DY7bBua9e9Aygmz8XmB',
//     title: 'Como Jordan',
//     artist: 'Junior H',
//     available: true,
//     tempo: 112.503,
//     energy: 0.873,
//     valence: 0.628
//   },
//   {
//     trackId: '3w1h7uNU1Dfk2tOaHiIGat',
//     title: 'PERO NO TE ENAMORES',
//     artist: 'Fuerza Regida',
//     available: true,
//     tempo: 118.044,
//     energy: 0.886,
//     valence: 0.827
//   },
//   {
//     trackId: '68x2TVlhCCwwBmszzLeCcQ',
//     title: 'Suena',
//     artist: 'Junior H;José Mejía',
//     available: true,
//     tempo: 84.621,
//     energy: 0.623,
//     valence: 0.557
//   },
//   {
//     trackId: '4AYXjnxnA4Tsr8CAYuKQDo',
//     title: 'Gracias A Ti',
//     artist: 'DannyLux',
//     available: true,
//     tempo: 93.887,
//     energy: 0.337,
//     valence: 0.559
//   },
//   {
//     trackId: '1J1TG8a9E5s3QxQhboX8Lc',
//     title: 'Culpable',
//     artist: 'Junior H',
//     available: true,
//     tempo: 92.014,
//     energy: 0.58,
//     valence: 0.429
//   },
//   {
//     trackId: '2GnyD2EllduW0BjmacUSNL',
//     title: 'Designer',
//     artist: 'Balu Brigada',
//     available: true,
//     tempo: 102.969,
//     energy: 0.86,
//     valence: 0.861
//   },
//   {
//     trackId: '0phzfJn8NeT1LkbqfV2peI',
//     title: 'Lejos de Ti',
//     artist: 'The Marías',
//     available: true,
//     tempo: 81.964,
//     energy: 0.473,
//     valence: 0.432
//   },
//   {
//     trackId: '2lbfCvmKCmsQjBqq8yFlGj',
//     title: "80 Dime Bagz [Boomin' Like Alicia Keys] (feat. Black Kray & Ethelwulf)",
//     artist: 'Chris Travis;Black Kray;Ethelwulf',
//     available: true,
//     tempo: 134.362,
//     energy: 0.415,
//     valence: 0.468
//   },
//   {
//     trackId: '1CqcGbXZrpJJygqUM8PW05',
//     title: 'My Heart',
//     artist: 'Odeal',
//     available: true,
//     tempo: 113.075,
//     energy: 0.642,
//     valence: 0.487
//   },
//   {
//     trackId: '7ceLb4TBk4IOPirddCJ1k6',
//     title: 'Vista',
//     artist: 'Okonski',
//     available: true,
//     tempo: 137.288,
//     energy: 0.456,
//     valence: 0.579
//   },
//   {
//     trackId: '7GZDDVbMYL6oFlmJMULaMo',
//     title: 'Leanin - Slowed',
//     artist: 'CorMill',
//     available: true,
//     tempo: 129.625,
//     energy: 0.127,
//     valence: 0.0616
//   },
//   {
//     trackId: '0J9g1MMJDhyvOb3NWckHMm',
//     title: 'Chulo pt.2',
//     artist: 'Bad Gyal;Tokischa;Young Miko',
//     available: true,
//     tempo: 96.984,
//     energy: 0.881,
//     valence: 0.556
//   },
//   {
//     trackId: '3PU3neC9XmWz7ZjUn5rYIw',
//     title: 'Out There',
//     artist: 'Project Pat',
//     available: true,
//     tempo: 160.041,
//     energy: 0.67,
//     valence: 0.407
//   },
//   {
//     trackId: '3A4S0o95OxSgRbqEnEMsn4',
//     title: 'Life We Live (feat. Namond Lumpkin & Edgar Fletcher)',
//     artist: 'Project Pat;Namond Lumpkin;Edgar Fletcher',
//     available: true,
//     tempo: 76.99,
//     energy: 0.633,
//     valence: 0.241
//   },
//   {
//     trackId: '6R6MEAGzdsb1rXEWlJelYY',
//     title: "Ooh Nuthin'",
//     artist: 'Project Pat',
//     available: true,
//     tempo: 158.057,
//     energy: 0.634,
//     valence: 0.682
//   },
//   {
//     trackId: '5WVWQQpBJqljbZtxo19CxS',
//     title: 'Calling U Back',
//     artist: 'The Marías',
//     available: true,
//     tempo: 116.798,
//     energy: 0.515,
//     valence: 0.448
//   },
//   {
//     trackId: '4gtIYSYu8u2ItBqrhCaChL',
//     title: 'Paranoia',
//     artist: 'The Marías',
//     available: true,
//     tempo: 120.039,
//     energy: 0.639,
//     valence: 0.773
//   },
//   {
//     trackId: '4UaF1B1YX1zBokeqjGO2fl',
//     title: 'Make Way For The Sun',
//     artist: 'O & The Mo',
//     available: true,
//     tempo: 124.012,
//     energy: 0.519,
//     valence: 0.855
//   },
//   {
//     trackId: '2CBtdZVcpSwaxOcLUi1AGo',
//     title: 'Care For You',
//     artist: 'The Marías',
//     available: true,
//     tempo: 109.988,
//     energy: 0.413,
//     valence: 0.869
//   },
//   {
//     trackId: '0tbar3AoobXRjfhlh7b95g',
//     title: 'DEEP IN YOUR SOUL',
//     artist: 'alan vuong',
//     available: true,
//     tempo: 171.434,
//     energy: 0.654,
//     valence: 0.219
//   },
//   {
//     trackId: '0gmStTUTuiU807EB4KafOX',
//     title: 'Yours',
//     artist: 'maye',
//     available: true,
//     tempo: 89.008,
//     energy: 0.707,
//     valence: 0.799
//   },
//   {
//     trackId: '5Dp7CfpvcRYCamP1MTXxN1',
//     title: 'What More Can I Do',
//     artist: '54 Ultra',
//     available: true,
//     tempo: 99.915,
//     energy: 0.564,
//     valence: 0.644
//   },
//   {
//     trackId: '0fnY4MQat2zJsb8FKyLM9D',
//     title: 'Lie To Me',
//     artist: 'Chris Isaak',
//     available: true,
//     tempo: 116.361,
//     energy: 0.491,
//     valence: 0.649
//   },
//   {
//     trackId: '6dXko4YIGsaf16IuGO3JIq',
//     title: 'Love Ride (Alternative Version)',
//     artist: 'Jordan Lee',
//     available: true,
//     tempo: 95.98,
//     energy: 0.468,
//     valence: 0.791
//   },
//   {
//     trackId: '7nD1FxMlz8nmvXIQlIOgzi',
//     title: "Even When You're Gone",
//     artist: 'Arjuna Oakes;Serebii',
//     available: true,
//     tempo: 148.02,
//     energy: 0.329,
//     valence: 0.243
//   },
//   {
//     trackId: '10SNXwO2GCZdaL5NP73hIa',
//     title: 'Magic City Thrill',
//     artist: 'James Tillman',
//     available: true,
//     tempo: 199.618,
//     energy: 0.779,
//     valence: 0.252
//   }
]

const demoLikes: DemoLikeEntry[] = [
//   { trackId: '3Vd4fHzwS6pBS3muymjiDi', addedAt: 1760933712 },
//   { trackId: '6sGIMrtIzQjdzNndVxe397', addedAt: 1760897822 },
//   { trackId: '5AKfkVoqjbksuQ7OBcK7eo', addedAt: 1760851644 },
//   { trackId: '6e6ngB7`0V7X4NFGP7vN1ic', addedAt: 1760842116 },
//   { trackId: '29ZBUEAIGJUfutb7YCkOiO', addedAt: 1760842110 },
//   { trackId: '3gnWvEHvlaNb3DecldAs33', addedAt: 1760842102 },
//   { trackId: '2uWyRgo5ILEKxozm92t2ob', addedAt: 1760842100 },
//   { trackId: '0Z8Deaa7KsxIqWOEWoTFo1', addedAt: 1760842098 },
  { trackId: '7xzqgS9xNlvZi2AZvGBa7m', addedAt: 1760795975 },
//   { trackId: '6F8R48yp2MwKOCONQgEMzw', addedAt: 1760645441 },
//   { trackId: '6WnWNaP97gqu4Zr1bPZeE7', addedAt: 1760645439 },
//   { trackId: '3Pafvx9caYw7m4e0lyWgBl', addedAt: 1760645020 },
//   { trackId: '7bvkBpcJnYHCuiyoDk9t3l', addedAt: 1760583414 },
//   { trackId: '0jr6tT2vc4cIFPHb6wufG3', addedAt: 1760472015 },
//   { trackId: '0PWtb8aCf6vVudatSVUSst', addedAt: 1760243622 },
//   { trackId: '7ms6jXUWNRbmZzTBlJwZef', addedAt: 1760217726 },
//   { trackId: '0jXiHFeSflfTiQtezpFMwn', addedAt: 1759980615 },
//   { trackId: '5mSoqzA0VoYLfXZ1FDo36S', addedAt: 1759980611 },
//   { trackId: '3R8IbTKkaFHqK2AE1CJmQu', addedAt: 1759980606 },
//   { trackId: '2HsRSiAFubcJaeQJ9pttC9', addedAt: 1759980120 },
//   { trackId: '278ppB9nzHsAAazgjAT313', addedAt: 1759959211 },
//   { trackId: '43jjp5s4gbwoCmBQQczKbo', addedAt: 1759956166 },
//   { trackId: '7IerUPqxU6Fp69S9UDCOQm', addedAt: 1759955382 },
//   { trackId: '709ZIqPHyFOpx2QdjmeWAM', addedAt: 1759765106 },
//   { trackId: '3KH7W2zKlPHeLc2dS9UQe4', addedAt: 1759764117 },
//   { trackId: '5Pxw4MqAFpXufdGhnAmYgI', addedAt: 1759712704 },
//   { trackId: '1dyA1Re4QEQQWGDDT7h9TK', addedAt: 1759679638 },
//   { trackId: '128I36bDgYHU9l2QcgEGcd', addedAt: 1759635486 },
//   { trackId: '3Q3kB5uskRw5o1ffwFO3G0', addedAt: 1759512915 },
//   { trackId: '45QBDwd7BCdqCpxSj4N9tm', addedAt: 1759512886 },
//   { trackId: '7C2uY2KCfOW3PzCCfWDERA', addedAt: 1759500605 },
//   { trackId: '119MQfBVx1XVcB4q9PlnJW', addedAt: 1759500602 },
//   { trackId: '5RHhmGMV3FKxRa63AIfIgZ', addedAt: 1759378592 },
//   { trackId: '3dSZcr7SWwFdOmY0r3Ryih', addedAt: 1759277696 },
//   { trackId: '7dfjkwagedO9FLbjUXRAZE', addedAt: 1759276943 },
//   { trackId: '3WL8kYh2pIdT0C0h2drfPf', addedAt: 1759109284 },
//   { trackId: '0RyekuZ6N0SkpokVwkVnbg', addedAt: 1759109279 },
//   { trackId: '6KafcmIAnIcYOA1Qppfurb', addedAt: 1759109271 },
//   { trackId: '02A70z86yAU41b21L516v7', addedAt: 1759091384 },
//   { trackId: '77lKjGkhvWuimTzQxA4STK', addedAt: 1759091376 },
//   { trackId: '2K6Nk2bR9xPE39EY9mARVa', addedAt: 1759091371 },
//   { trackId: '29x8z6fxeHdVTc0P3rhv10', addedAt: 1759091347 },
//   { trackId: '3X7wVYr4XpzGgoXmQVnrJo', addedAt: 1759091335 },
//   { trackId: '5N2cPHhndfHTfrTjPOjvJe', addedAt: 1759089046 },
//   { trackId: '0nYYKcUcjOqg21Di98ubDc', addedAt: 1759088628 },
//   { trackId: '3z0JwddAR5GASTxnKExIw1', addedAt: 1759016569 },
//   { trackId: '4aptr0Era7aIdkX5gfsaFN', addedAt: 1759016566 },
//   { trackId: '3YbFagT5wCU8M9xLdVID4j', addedAt: 1759016040 },
//   { trackId: '2OxidMKQ4V3V9XIofZIm7L', addedAt: 1758897388 },
//   { trackId: '1VNZ7LWT495ICAO4CvOaTX', addedAt: 1758897385 },
//   { trackId: '2cgHekIPyuKxEEcV72tuy4', addedAt: 1758896951 },
//   { trackId: '5KQ6jVizgxjd2XBn8qKKCh', addedAt: 1758896944 },
//   { trackId: '3mU588Di5vqL2w3d3J2dJd', addedAt: 1758896941 },
//   { trackId: '47yngLaqEr3z1lnk7ok0OV', addedAt: 1758751362 },
//   { trackId: '5mxyCS71pwJP71GOGNTyFE', addedAt: 1758751008 },
//   { trackId: '3hmCHZFkgE4tkJKSqpOUhz', addedAt: 1758677505 },
//   { trackId: '3AH0jj54A0BNMOXz34neIB', addedAt: 1758571756 },
//   { trackId: '3haDFkQVqexHwwxVNU5BHh', addedAt: 1758571754 },
//   { trackId: '5P6ByN1elQzHH66vKlAB9a', addedAt: 1758571608 },
//   { trackId: '2YtTNxvA5PeUWMq3JSEmJQ', addedAt: 1758502547 },
//   { trackId: '0Qp66EJS2DalnLkRKmu7mX', addedAt: 1758502067 },
//   { trackId: '25Lz9RaOo8sVH34BoDqCJR', addedAt: 1758470219 },
//   { trackId: '1Ms8SsQJiTJ3zEMosUWkUR', addedAt: 1758469713 },
//   { trackId: '0ZxdL5vV2jV4rfiZg2v76T', addedAt: 1758468249 },
//   { trackId: '0NZwAPRO1DqSAprpZHnBiE', addedAt: 1758468084 },
//   { trackId: '5KQNhnUSvG8VSs24qEoSu9', addedAt: 1758467708 },
//   { trackId: '6ibvxqNzzrEvIuF4oDDgGs', addedAt: 1758466351 },
//   { trackId: '3nd4JyjkxQodjjvQd5Gmgd', addedAt: 1758462111 },
//   { trackId: '5fDDQmf4HaV848CIyrP2vl', addedAt: 1758436460 },
//   { trackId: '1g93upxwFhq1vg0OPYTq2r', addedAt: 1758415622 },
//   { trackId: '4PNii2qmrTZD0fzQ7gr0UT', addedAt: 1758337874 },
//   { trackId: '1fbMGnVgmS72f4CUWnPTMU', addedAt: 1758337866 },
//   { trackId: '0XZyF9lv6diMt4bxThOL0h', addedAt: 1758337853 },
//   { trackId: '6lRJqlbbsSAyoN67hVsF8A', addedAt: 1758320149 },
//   { trackId: '2q7DY7bBua9e9Aygmz8XmB', addedAt: 1758307671 },
//   { trackId: '3w1h7uNU1Dfk2tOaHiIGat', addedAt: 1758307223 },
//   { trackId: '68x2TVlhCCwwBmszzLeCcQ', addedAt: 1758307211 },
//   { trackId: '4AYXjnxnA4Tsr8CAYuKQDo', addedAt: 1758307208 },
//   { trackId: '1J1TG8a9E5s3QxQhboX8Lc', addedAt: 1758299200 },
//   { trackId: '2GnyD2EllduW0BjmacUSNL', addedAt: 1758239399 },
//   { trackId: '0phzfJn8NeT1LkbqfV2peI', addedAt: 1758237998 },
//   { trackId: '2lbfCvmKCmsQjBqq8yFlGj', addedAt: 1758085898 },
//   { trackId: '1CqcGbXZrpJJygqUM8PW05', addedAt: 1758078685 },
//   { trackId: '7ceLb4TBk4IOPirddCJ1k6', addedAt: 1758077971 },
//   { trackId: '7GZDDVbMYL6oFlmJMULaMo', addedAt: 1758065884 },
//   { trackId: '0J9g1MMJDhyvOb3NWckHMm', addedAt: 1758053285 },
//   { trackId: '3PU3neC9XmWz7ZjUn5rYIw', addedAt: 1758032566 },
//   { trackId: '3A4S0o95OxSgRbqEnEMsn4', addedAt: 1758004257 },
//   { trackId: '6R6MEAGzdsb1rXEWlJelYY', addedAt: 1758004250 },
//   { trackId: '5WVWQQpBJqljbZtxo19CxS', addedAt: 1757953329 },
//   { trackId: '4gtIYSYu8u2ItBqrhCaChL', addedAt: 1757946276 },
//   { trackId: '4UaF1B1YX1zBokeqjGO2fl', addedAt: 1757946273 },
//   { trackId: '2CBtdZVcpSwaxOcLUi1AGo', addedAt: 1757945606 },
//   { trackId: '0tbar3AoobXRjfhlh7b95g', addedAt: 1757945603 },
//   { trackId: '0gmStTUTuiU807EB4KafOX', addedAt: 1757945595 },
//   { trackId: '5Dp7CfpvcRYCamP1MTXxN1', addedAt: 1757945592 },
//   { trackId: '0fnY4MQat2zJsb8FKyLM9D', addedAt: 1757904675 },
//   { trackId: '6dXko4YIGsaf16IuGO3JIq', addedAt: 1757865366 },
//   { trackId: '7nD1FxMlz8nmvXIQlIOgzi', addedAt: 1757781796 },
//   { trackId: '10SNXwO2GCZdaL5NP73hIa', addedAt: 1757781794 }
]

const trackLookup = new Map(demoTracks.map((track) => [track.trackId, track]))

export function getDemoLikedTrackIds(): string[] {
  return demoLikes.map((entry) => entry.trackId)
}

export function getDemoTrackMeta(trackId: string): DemoTrackMeta | null {
  return trackLookup.get(trackId) ?? null
}

export function getDemoLikeEntry(trackId: string): DemoLikeEntry | null {
  return demoLikes.find((entry) => entry.trackId === trackId) ?? null
}
