export type ChristianGenre =
  | 'all'
  | 'metal-hardcore'
  | 'rock'
  | 'hiphop'
  | 'worship'
  | 'rnb'
  | 'country-southern'
  | 'punk-ska'
  | 'reggae-afro'
  | 'workout-edm'
  | 'ai-originals';

export type SourceOrigin = 'Verified Artist' | 'AI Studio Original';
export type PlatformSource = 'YouTube Music' | 'Spotify' | 'Apple Music' | 'FaithTracks Studio';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: Exclude<ChristianGenre, 'all'>;
  genreLabel: string;
  duration: number; // in seconds
  bpm: number;
  keySignature: string;
  coverUrl: string;
  audioPreviewUrl?: string; // Real Apple Music / iTunes AAC stream
  directStreamUrl?: string; // Direct global CDN stream URL for instant playback
  youtubeVideoId?: string; // Real YouTube Official Audio/Video ID for full-song playback
  youtubeCandidates?: string[]; // Embed-verified full-length YouTube Lyric & Audio IDs
  sourceOrigin: SourceOrigin;
  platformIngestedFrom: PlatformSource;
  ingestedTimestamp: string;
  scriptureReference: string;
  lyricsSnippet: string[];
  workoutSuitability: ('Calisthenics Strength' | 'Bike Cadence' | 'HIIT Finisher' | 'Mobility & Cooldown')[];
  hiFiFormat: '24-bit/96kHz FLAC' | '320kbps AAC' | 'Spatial Dolby Atmos';
  playsCount: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  category: string;
  trackIds: string[];
  isOfflineSaved: boolean;
  createdBy: string;
  followersCount: string;
}

export const COVER_ROCK_ALTAR = '/src/assets/images/album_cover_rock_altar_1794428022636.jpg';
export const COVER_HIPHOP_CROWN = '/src/assets/images/album_cover_hiphop_crown_1794428024413.jpg';
export const COVER_WORSHIP_RNB = '/src/assets/images/album_cover_worship_rnb_1794428025961.jpg';
export const BANNER_CALISTHENICS = '/src/assets/images/calisthenics_workout_banner_1794428026744.jpg';

export const GENRE_CATEGORIES: {
  id: ChristianGenre;
  label: string;
  subtitle: string;
  bpmRange: string;
}[] = [
  { id: 'all', label: 'All Christian', subtitle: 'Every Christian Genre Everywhere', bpmRange: '70–185 BPM' },
  { id: 'metal-hardcore', label: 'Metal, Thrash & Hardcore', subtitle: 'Demon Hunter, Bloodrage, Living Sacrifice, War of Ages, Impending Doom, Stryper', bpmRange: '140–185 BPM' },
  { id: 'hiphop', label: 'Christian Hip-Hop & Street CHH', subtitle: 'Kamban, T-Strike, Lecrae, TobyMac, Bryann T, KB, T-Bone, NF, Hulvey', bpmRange: '125–162 BPM' },
  { id: 'rock', label: 'Christian Rock & Alt', subtitle: 'Skillet, Red, TFK, Disciple, Flyleaf, Wolves At The Gate, Fit For A King', bpmRange: '130–172 BPM' },
  { id: 'worship', label: 'Worship & Praise', subtitle: 'Brandon Lake, Elevation, Wickham, Lauren Daigle, CeCe Winans, Josiah Queen', bpmRange: '72–134 BPM' },
  { id: 'rnb', label: 'Gospel R&B & Soul', subtitle: 'Kirk Franklin, Jonathan McReynolds, Sondae, Madison Ryann Ward', bpmRange: '82–120 BPM' },
  { id: 'country-southern', label: 'Christian Country & Southern', subtitle: 'Zach Williams, Crowder, NEEDTOBREATHE, Anne Wilson, We The Kingdom', bpmRange: '95–142 BPM' },
  { id: 'punk-ska', label: 'Christian Punk & Ska', subtitle: 'MxPx, Relient K, The O.C. Supertones, Five Iron Frenzy', bpmRange: '145–178 BPM' },
  { id: 'reggae-afro', label: 'Reggae, Dancehall & Afro-Gospel', subtitle: 'Christafari, Limoblaze, CalledOut Music, Papa San, Sherwin Gardner', bpmRange: '96–128 BPM' },
  { id: 'workout-edm', label: 'Bike & Calisthenics EDM', subtitle: 'Capital Kings, Gui Brazil, Matthew Parker, Gawvi', bpmRange: '138–174 BPM' },
  { id: 'ai-originals', label: 'Contemporary & Indie', subtitle: 'Colton Dixon, MercyMe, Josiah Queen, Lauren Daigle', bpmRange: '95–170 BPM' },
];

interface RawSeedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: Exclude<ChristianGenre, 'all'>;
  genreLabel: string;
  duration: number;
  bpm: number;
  key: string;
  origin: SourceOrigin;
  platform: PlatformSource;
  verse: string;
  plays: string;
}

const RAW_SEED_CATALOG: RawSeedTrack[] = [
  // FEATURED REQUESTED ARTISTS: KAMBAN, T-STRIKE, BLOODRAGE & DEMON HUNTER
  { id: 'trk-kamban-1', title: 'Got to Go', artist: 'Kamban', album: 'Kamban Singles', genre: 'hiphop', genreLabel: 'Street Christian Hip-Hop', duration: 255, bpm: 148, key: 'C Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Philippians 3:14', plays: '1.8M' },
  { id: 'trk-kamban-2', title: 'Luke Cage (ft. Mike Teezy)', artist: 'Kamban', album: 'Unbreakable Kingdom', genre: 'hiphop', genreLabel: 'Hardcore Christian Rap', duration: 158, bpm: 154, key: 'F Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Ephesians 6:11', plays: '2.4M' },
  { id: 'trk-kamban-3', title: 'The Race (ft. Xay Hill)', artist: 'Kamban', album: 'The Race', genre: 'hiphop', genreLabel: 'Christian Hip-Hop / Workout', duration: 223, bpm: 146, key: 'D Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Hebrews 12:1', plays: '3.1M' },
  { id: 'trk-kamban-4', title: 'Covenant', artist: 'Kamban', album: 'Covenant', genre: 'hiphop', genreLabel: 'Christian Rap', duration: 238, bpm: 140, key: 'G Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Genesis 9:16', plays: '1.5M' },
  { id: 'trk-kamban-5', title: 'Rain Down', artist: 'Kamban', album: 'Rain Down', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', duration: 195, bpm: 138, key: 'Bb Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Psalm 72:6', plays: '1.9M' },
  { id: 'trk-kamban-6', title: 'Marvelous Things', artist: 'Kamban', album: 'Marvelous Things', genre: 'ai-originals', genreLabel: 'Underground Christian Rap', duration: 150, bpm: 144, key: 'E Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Psalm 98:1', plays: '1.2M' },

  { id: 'trk-tstrike-1', title: 'Put A Date On It', artist: 'T-Strike', album: 'Mission One', genre: 'hiphop', genreLabel: 'Hardcore Christian Hip-Hop', duration: 204, bpm: 150, key: 'C# Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Habakkuk 2:3', plays: '2.2M' },
  { id: 'trk-tstrike-2', title: 'That’s a W', artist: 'T-Strike', album: 'Victory Lap', genre: 'hiphop', genreLabel: 'Christian Workout Trap', duration: 223, bpm: 156, key: 'G Minor', origin: 'Verified Artist', platform: 'Spotify', verse: '1 Corinthians 15:57', plays: '3.4M' },
  { id: 'trk-tstrike-3', title: 'Soul Cry', artist: 'T-Strike', album: 'Dying To Live', genre: 'hiphop', genreLabel: 'Street Gospel Rap', duration: 234, bpm: 136, key: 'D Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Psalm 130:1', plays: '2.7M' },
  { id: 'trk-tstrike-4', title: 'Let’s Not Forget (Dying To Live)', artist: 'T-Strike', album: 'Mission One', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', duration: 242, bpm: 142, key: 'F Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Galatians 2:20', plays: '1.9M' },
  { id: 'trk-tstrike-5', title: 'When You See Me', artist: 'T-Strike', album: 'When You See Me', genre: 'hiphop', genreLabel: 'Christian Rap', duration: 260, bpm: 144, key: 'A Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'John 14:9', plays: '1.6M' },
  { id: 'trk-tstrike-6', title: 'I Know I Know', artist: 'T-Strike', album: 'LiveLoud', genre: 'ai-originals', genreLabel: 'Underground CHH Anthem', duration: 307, bpm: 148, key: 'E Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Romans 8:28', plays: '2.1M' },

  { id: 'trk-bloodrage-1', title: 'Closing In', artist: 'Bloodrage', album: 'Bloodrage Metal', genre: 'metal-hardcore', genreLabel: 'Christian Heavy Metal / Hardcore', duration: 250, bpm: 172, key: 'D Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Psalm 18:2', plays: '4.6M' },
  { id: 'trk-bloodrage-2', title: 'Scared To Break Again', artist: 'Bloodrage', album: 'Bloodrage Metal', genre: 'metal-hardcore', genreLabel: 'Christian Metalcore', duration: 305, bpm: 168, key: 'C Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Psalm 34:18', plays: '3.8M' },
  { id: 'trk-bloodrage-3', title: 'Nothing Left Of Me', artist: 'Bloodrage', album: 'Bloodrage Live', genre: 'metal-hardcore', genreLabel: 'Christian Thrash / Metal', duration: 263, bpm: 176, key: 'E Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'John 3:30', plays: '2.9M' },
  { id: 'trk-bloodrage-4', title: 'Your Hand, My Home', artist: 'Bloodrage', album: 'Bloodrage Metal', genre: 'metal-hardcore', genreLabel: 'Melodic Christian Metal', duration: 299, bpm: 160, key: 'B Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Isaiah 41:10', plays: '3.2M' },

  // CHRISTIAN METAL, THRASH, DEATHCORE & HARDCORE (Demon Hunter, Living Sacrifice, War of Ages, Impending Doom, Stryper, Mortification)
  { id: 'trk-demon-hunter-3', title: 'I Am A Stone', artist: 'Demon Hunter', album: 'Extremist', genre: 'metal-hardcore', genreLabel: 'Christian Metal', duration: 344, bpm: 140, key: 'D Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Psalm 62:6', plays: '42.8M' },
  { id: 'trk-demon-hunter-1', title: 'I Will Fail You', artist: 'Demon Hunter', album: 'True Defiance', genre: 'metal-hardcore', genreLabel: 'Christian Metal', duration: 274, bpm: 142, key: 'D Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Hebrews 13:5', plays: '26.5M' },
  { id: 'trk-demon-hunter-2', title: 'On My Side', artist: 'Demon Hunter', album: 'War', genre: 'metal-hardcore', genreLabel: 'Christian Heavy Metal', duration: 245, bpm: 168, key: 'B Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Psalm 118:6', plays: '18.2M' },
  { id: 'trk-demon-hunter-4', title: 'The Last One Alive', artist: 'Demon Hunter', album: 'Extremist', genre: 'metal-hardcore', genreLabel: 'Christian Metalcore', duration: 268, bpm: 164, key: 'C Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Matthew 24:13', plays: '31.4M' },
  { id: 'trk-demon-hunter-5', title: 'Undying', artist: 'Demon Hunter', album: 'The Triptych', genre: 'metal-hardcore', genreLabel: 'Christian Metalcore', duration: 261, bpm: 170, key: 'D Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: '1 Corinthians 15:54', plays: '29.7M' },
  { id: 'trk-demon-hunter-6', title: 'Collapsing', artist: 'Demon Hunter', album: 'The World Is a Thorn', genre: 'metal-hardcore', genreLabel: 'Christian Thrash / Metalcore', duration: 223, bpm: 174, key: 'E Minor', origin: 'Verified Artist', platform: 'Spotify', verse: '2 Corinthians 4:8-9', plays: '27.1M' },
  { id: 'trk-living-sacrifice-1', title: 'Reject', artist: 'Living Sacrifice', album: 'Reborn', genre: 'metal-hardcore', genreLabel: 'Christian Thrash / Groove Metal', duration: 215, bpm: 176, key: 'D Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Romans 12:1', plays: '14.5M' },
  { id: 'trk-war-of-ages-1', title: 'All Consuming Fire', artist: 'War of Ages', album: 'Arise and Conquer', genre: 'metal-hardcore', genreLabel: 'Christian Melodic Metalcore', duration: 255, bpm: 178, key: 'C Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Hebrews 12:29', plays: '16.2M' },
  { id: 'trk-impending-doom-1', title: 'Nailed. Dead. Risen.', artist: 'Impending Doom', album: 'Nailed. Dead. Risen.', genre: 'metal-hardcore', genreLabel: 'Christian Deathcore / Goremageddon', duration: 218, bpm: 182, key: 'A Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Colossians 2:14', plays: '12.9M' },
  { id: 'trk-stryper-1', title: 'To Hell With The Devil', artist: 'Stryper', album: 'To Hell with the Devil', genre: 'metal-hardcore', genreLabel: 'Classic Christian Heavy Metal', duration: 249, bpm: 148, key: 'E Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: 'James 4:7', plays: '39.4M' },
  { id: 'trk-mortification-1', title: 'Scrolls of the Megilloth', artist: 'Mortification', album: 'Scrolls of the Megilloth', genre: 'metal-hardcore', genreLabel: 'Christian Thrash / Death Metal', duration: 267, bpm: 175, key: 'C# Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Revelation 20:10', plays: '9.8M' },

  // CHRISTIAN ROCK, HARDCORE & ALT METAL
  { id: 'trk-skillet-1', title: 'Feel Invincible', artist: 'Skillet', album: 'Unleashed', genre: 'rock', genreLabel: 'Christian Arena Rock', duration: 230, bpm: 156, key: 'G Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Philippians 4:13', plays: '142.1M' },
  { id: 'trk-skillet-2', title: 'Monster', artist: 'Skillet', album: 'Awake', genre: 'rock', genreLabel: 'Christian Hard Rock', duration: 178, bpm: 150, key: 'C Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Romans 7:15', plays: '488.4M' },
  { id: 'trk-skillet-3', title: 'Hero', artist: 'Skillet', album: 'Awake', genre: 'rock', genreLabel: 'Christian Arena Rock', duration: 187, bpm: 154, key: 'A Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: 'John 15:13', plays: '264.2M' },
  { id: 'trk-skillet-4', title: 'Awake and Alive', artist: 'Skillet', album: 'Awake', genre: 'rock', genreLabel: 'Christian Hard Rock', duration: 212, bpm: 152, key: 'D Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Ephesians 5:14', plays: '229.7M' },
  { id: 'trk-skillet-5', title: 'Legendary', artist: 'Skillet', album: 'Victorious', genre: 'rock', genreLabel: 'Christian Rock', duration: 244, bpm: 144, key: 'D Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: '1 Corinthians 9:24', plays: '69.7M' },
  { id: 'trk-skillet-6', title: 'The Resistance', artist: 'Skillet', album: 'Unleashed', genre: 'rock', genreLabel: 'Christian Hard Rock', duration: 232, bpm: 158, key: 'E Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'James 4:7', plays: '115.2M' },
  { id: 'trk-red-1', title: 'Breathe Into Me', artist: 'Red', album: 'End of Silence', genre: 'rock', genreLabel: 'Christian Alt Metal', duration: 214, bpm: 146, key: 'B Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Ezekiel 37:5', plays: '81.7M' },
  { id: 'trk-red-2', title: 'Already Over', artist: 'Red', album: 'End of Silence', genre: 'rock', genreLabel: 'Christian Hard Rock', duration: 238, bpm: 152, key: 'C# Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'John 19:30', plays: '49.4M' },
  { id: 'trk-red-3', title: 'Feed the Machine', artist: 'Red', album: 'Until We Have Faces', genre: 'rock', genreLabel: 'Christian Metal', duration: 308, bpm: 160, key: 'D Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Romans 12:2', plays: '24.6M' },
  { id: 'trk-tfk-1', title: 'Courtesy Call', artist: 'Thousand Foot Krutch', album: 'The End Is Where We Begin', genre: 'rock', genreLabel: 'Christian Hard Rock', duration: 236, bpm: 158, key: 'E Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Ephesians 6:10', plays: '195.1M' },
  { id: 'trk-tfk-2', title: 'War of Change', artist: 'Thousand Foot Krutch', album: 'The End Is Where We Begin', genre: 'rock', genreLabel: 'Christian Rock', duration: 231, bpm: 160, key: 'F Minor', origin: 'Verified Artist', platform: 'Spotify', verse: '2 Corinthians 5:17', plays: '94.8M' },
  { id: 'trk-tfk-3', title: 'Untraveled Road', artist: 'Thousand Foot Krutch', album: 'OXYGEN:INHALE', genre: 'rock', genreLabel: 'Christian Arena Rock', duration: 235, bpm: 148, key: 'C Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Joshua 1:9', plays: '68.3M' },
  { id: 'trk-disciple-1', title: 'Radical', artist: 'Disciple', album: 'Attack', genre: 'rock', genreLabel: 'Christian Hard Rock', duration: 215, bpm: 164, key: 'G Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Luke 9:23', plays: '24.9M' },
  { id: 'trk-disciple-2', title: 'Dear X (You Don’t Own Me)', artist: 'Disciple', album: 'Horseshoes & Handgrenades', genre: 'rock', genreLabel: 'Christian Rock', duration: 222, bpm: 148, key: 'A Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Romans 8:1', plays: '47.3M' },
  { id: 'trk-flyleaf-1', title: 'All Around Me', artist: 'Flyleaf', album: 'Flyleaf', genre: 'rock', genreLabel: 'Christian Alt Rock', duration: 198, bpm: 145, key: 'F# Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Psalm 139:7', plays: '172.0M' },
  { id: 'trk-flyleaf-2', title: 'I’m So Sick', artist: 'Flyleaf', album: 'Flyleaf', genre: 'rock', genreLabel: 'Christian Post-Hardcore', duration: 176, bpm: 156, key: 'E Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Isaiah 1:5', plays: '148.2M' },
  { id: 'trk-wolves-1', title: 'Heralds', artist: 'Wolves At The Gate', album: 'Captors', genre: 'rock', genreLabel: 'Christian Post-Hardcore', duration: 249, bpm: 165, key: 'D Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Isaiah 61:1', plays: '11.8M' },
  { id: 'trk-fitforaking-1', title: 'When Everything Means Nothing', artist: 'Fit For A King', album: 'Dark Skies', genre: 'metal-hardcore', genreLabel: 'Christian Metalcore', duration: 228, bpm: 170, key: 'C Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Ecclesiastes 1:2', plays: '31.6M' },
  { id: 'trk-switchfoot-1', title: 'Meant to Live', artist: 'Switchfoot', album: 'The Beautiful Letdown', genre: 'rock', genreLabel: 'Christian Alt Rock', duration: 205, bpm: 152, key: 'B Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'John 10:10', plays: '122.5M' },
  { id: 'trk-memphis-1', title: 'Make Way', artist: 'Memphis May Fire', album: 'Remade in Misery', genre: 'metal-hardcore', genreLabel: 'Christian Metalcore', duration: 219, bpm: 162, key: 'E Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Isaiah 43:19', plays: '18.4M' },
  { id: 'trk-kutless-1', title: 'Strong Tower', artist: 'Kutless', album: 'Strong Tower', genre: 'rock', genreLabel: 'Christian Worship Rock', duration: 239, bpm: 138, key: 'G Major', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Proverbs 18:10', plays: '42.0M' },
  { id: 'trk-pillar-1', title: 'Frontline', artist: 'Pillar', album: 'Where Do We Go from Here', genre: 'rock', genreLabel: 'Christian Hard Rock', duration: 208, bpm: 156, key: 'C Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Ephesians 6:13', plays: '38.7M' },

  // CHRISTIAN HIP-HOP (CHH), STREET GOSPEL & TRAP
  { id: 'trk-bryannt-1', title: 'Who Told You / Purpose', artist: 'Bryann T (Kingdom Muzic)', album: 'Kingdom Muzic', genre: 'hiphop', genreLabel: 'Street Gospel CHH', duration: 414, bpm: 142, key: 'C Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Jeremiah 29:11', plays: '14.2M' },
  { id: 'trk-bryannt-2', title: 'Middle of My Storm', artist: 'Bryann T (Kingdom Muzic)', album: 'Kingdom Muzic', genre: 'hiphop', genreLabel: 'Street Christian Rap', duration: 267, bpm: 138, key: 'F Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Mark 4:39', plays: '9.8M' },
  { id: 'trk-tbone-1', title: 'Ride Wit Me', artist: 'T-Bone', album: 'Tha Last Street Preacha', genre: 'hiphop', genreLabel: 'West Coast Christian Rap', duration: 258, bpm: 146, key: 'G Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Psalm 23:4', plays: '11.4M' },
  { id: 'trk-gospel-gangstaz-1', title: 'I Can See Clearly Now', artist: 'Gospel Gangstaz', album: 'I Can See Clearly Now', genre: 'hiphop', genreLabel: 'Classic West Coast CHH', duration: 250, bpm: 134, key: 'D Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'John 9:25', plays: '8.7M' },
  { id: 'trk-tobymac-1', title: 'Help Is On The Way (Maybe Midnight)', artist: 'TobyMac', album: 'Life After Death', genre: 'hiphop', genreLabel: 'Christian Hip-Hop / Pop Rock', duration: 189, bpm: 136, key: 'F Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Psalm 121:1-2', plays: '54.2M' },
  { id: 'trk-tobymac-2', title: 'Move (Keep Walkin’)', artist: 'TobyMac', album: 'Tonight', genre: 'hiphop', genreLabel: 'Christian Hip-Hop / Funk', duration: 222, bpm: 138, key: 'G Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'James 1:2-4', plays: '68.9M' },
  { id: 'trk-tobymac-3', title: 'Til The Day I Die', artist: 'TobyMac', album: 'This Is Not a Test', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', duration: 227, bpm: 146, key: 'C Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Acts 20:24', plays: '71.4M' },
  { id: 'trk-tobymac-4', title: 'Eye On It', artist: 'TobyMac', album: 'Eye On It', genre: 'hiphop', genreLabel: 'Christian Electronic Hip-Hop', duration: 194, bpm: 142, key: 'D Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Hebrews 12:2', plays: '49.1M' },
  { id: 'trk-lecrae-1', title: 'Spread The Opps', artist: 'Lecrae', album: 'Church Clothes 4', genre: 'hiphop', genreLabel: 'Christian Hip-Hop / Trap', duration: 196, bpm: 148, key: 'C# Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Ephesians 6:12', plays: '29.6M' },
  { id: 'trk-lecrae-2', title: 'I’ll Find You', artist: 'Lecrae', album: 'All Things Work Together', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', duration: 217, bpm: 140, key: 'F Major', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Romans 8:28', plays: '142.3M' },
  { id: 'trk-lecrae-3', title: 'Coming In Hot', artist: 'Andy Mineo & Lecrae', album: 'Never Land II', genre: 'hiphop', genreLabel: '116 Trap / Workout Anthem', duration: 201, bpm: 152, key: 'E Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Romans 12:11', plays: '162.5M' },
  { id: 'trk-lecrae-4', title: 'Blessings', artist: 'Lecrae', album: 'All Things Work Together', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', duration: 231, bpm: 135, key: 'Ab Major', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Deuteronomy 28:2', plays: '94.7M' },
  { id: 'trk-kb-1', title: 'Armies', artist: 'KB', album: 'His Glory Alone', genre: 'hiphop', genreLabel: 'Christian Trap / CHH', duration: 204, bpm: 154, key: 'E Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Romans 8:31', plays: '26.4M' },
  { id: 'trk-kb-2', title: '10K', artist: 'KB', album: 'His Glory Alone', genre: 'hiphop', genreLabel: 'Christian Trap', duration: 198, bpm: 150, key: 'C Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Psalm 91:7', plays: '34.8M' },
  { id: 'trk-kb-3', title: 'King Jesus', artist: 'KB & Nobigdyl.', album: 'His Glory Alone II', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', duration: 211, bpm: 146, key: 'G Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Philippians 2:10', plays: '23.2M' },
  { id: 'trk-forrest-frank-1', title: 'GOOD DAY', artist: 'Forrest Frank', album: 'CHILD OF GOD', genre: 'hiphop', genreLabel: 'Christian Pop / Hip-Hop', duration: 178, bpm: 132, key: 'G Major', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Psalm 118:24', plays: '88.9M' },
  { id: 'trk-forrest-frank-2', title: 'UP!', artist: 'Forrest Frank & Connor Price', album: 'CHILD OF GOD', genre: 'hiphop', genreLabel: 'Christian Hip-Hop / Cadence', duration: 164, bpm: 144, key: 'A Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Colossians 3:2', plays: '61.2M' },
  { id: 'trk-hulvey-1', title: 'No Longer Bound', artist: 'Forrest Frank & Hulvey', album: 'CHILD OF GOD', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', duration: 176, bpm: 140, key: 'D Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Galatians 5:1', plays: '52.1M' },
  { id: 'trk-hulvey-2', title: 'Walk', artist: 'Hulvey & Lecrae', album: 'CRY', genre: 'hiphop', genreLabel: 'Christian Trap', duration: 192, bpm: 148, key: 'F Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Micah 6:8', plays: '28.5M' },
  { id: 'trk-nf-1', title: 'The Search', artist: 'NF', album: 'The Search', genre: 'hiphop', genreLabel: 'Cinematic Hip-Hop', duration: 248, bpm: 150, key: 'C Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Jeremiah 29:13', plays: '380.4M' },
  { id: 'trk-nf-2', title: 'HOPE', artist: 'NF', album: 'HOPE', genre: 'hiphop', genreLabel: 'Cinematic Hip-Hop', duration: 264, bpm: 146, key: 'D Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Romans 15:13', plays: '194.6M' },
  { id: 'trk-caleb-gordon-1', title: 'Rocky Road pt. 2', artist: 'Caleb Gordon', album: 'Before the Garden', genre: 'hiphop', genreLabel: 'Christian Melodic Rap', duration: 175, bpm: 136, key: 'Bb Major', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Matthew 7:14', plays: '37.9M' },
  { id: 'trk-alex-jean-1', title: 'By Faith', artist: 'Alex Jean', album: 'Kingdom Flow', genre: 'hiphop', genreLabel: 'Christian Drill / Trap', duration: 162, bpm: 156, key: 'C# Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: '2 Corinthians 5:7', plays: '24.3M' },
  { id: 'trk-miles-minnick-1', title: 'W.Y.T.', artist: 'Miles Minnick', album: 'Christlike', genre: 'hiphop', genreLabel: 'West Coast CHH', duration: 188, bpm: 142, key: 'G Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Matthew 5:16', plays: '16.8M' },

  // CHRISTIAN COUNTRY, SOUTHERN ROCK & ROOTS
  { id: 'trk-zach-williams-1', title: 'Chain Breaker', artist: 'Zach Williams', album: 'Chain Breaker', genre: 'country-southern', genreLabel: 'Christian Country / Southern Rock', duration: 197, bpm: 118, key: 'C Major', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'John 8:36', plays: '184.5M' },
  { id: 'trk-crowder-1', title: 'Come As You Are', artist: 'Crowder', album: 'Neon Steeple', genre: 'country-southern', genreLabel: 'Christian Southern Folk / Roots', duration: 290, bpm: 112, key: 'D Major', origin: 'Verified Artist', platform: 'Spotify', verse: 'Matthew 11:28', plays: '132.1M' },
  { id: 'trk-needtobreathe-1', title: 'Brother', artist: 'NEEDTOBREATHE', album: 'Rivers in the Wasteland', genre: 'country-southern', genreLabel: 'Christian Southern Rock', duration: 248, bpm: 128, key: 'C Major', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Proverbs 17:17', plays: '94.2M' },

  // CHRISTIAN PUNK, POP-PUNK & SKA
  { id: 'trk-mxpx-1', title: 'Chick Magnet', artist: 'MxPx', album: 'Life in General', genre: 'punk-ska', genreLabel: 'Christian Skate Punk', duration: 197, bpm: 168, key: 'E Major', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Proverbs 31:30', plays: '44.2M' },
  { id: 'trk-relientk-1', title: 'Be My Escape', artist: 'Relient K', album: 'Mmhmm', genre: 'punk-ska', genreLabel: 'Christian Pop-Punk', duration: 241, bpm: 156, key: 'B Major', origin: 'Verified Artist', platform: 'Spotify', verse: 'Psalm 32:7', plays: '118.4M' },
  { id: 'trk-supertones-1', title: 'Supertones Strike Back', artist: 'The O.C. Supertones', album: 'Supertones Strike Back', genre: 'punk-ska', genreLabel: 'Christian Ska-Punk', duration: 165, bpm: 166, key: 'A Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Revelation 19:11', plays: '14.8M' },

  // CHRISTIAN REGGAE, DANCEHALL & AFRO-GOSPEL
  { id: 'trk-christafari-1', title: 'Hosanna', artist: 'Christafari', album: 'Reggae Worship', genre: 'reggae-afro', genreLabel: 'Christian Roots Reggae', duration: 311, bpm: 114, key: 'G Major', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Mark 11:9', plays: '62.5M' },
  { id: 'trk-limoblaze-1', title: 'Jireh (My Provider)', artist: 'Limoblaze, Lecrae & Happi', album: 'Sunday In Lagos', genre: 'reggae-afro', genreLabel: 'Afro-Gospel R&B', duration: 184, bpm: 108, key: 'C Major', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Philippians 4:19', plays: '48.7M' },
  { id: 'trk-limoblaze-2', title: 'Desire', artist: 'Limoblaze', album: 'Young & Chosen', genre: 'reggae-afro', genreLabel: 'Afro-Gospel', duration: 176, bpm: 112, key: 'G Major', origin: 'Verified Artist', platform: 'Spotify', verse: 'Psalm 37:4', plays: '22.6M' },
  { id: 'trk-calledout-1', title: 'Warm Embrace', artist: 'CalledOut Music', album: 'Portraits', genre: 'reggae-afro', genreLabel: 'Afro-Soul R&B', duration: 192, bpm: 102, key: 'E Major', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Song of Solomon 2:6', plays: '18.2M' },

  // WORSHIP, PRAISE & ARENA ANTHEMS
  { id: 'trk-brandon-lake-1', title: 'Praise', artist: 'Elevation Worship & Brandon Lake', album: 'CAN YOU IMAGINE?', genre: 'worship', genreLabel: 'Modern Worship Anthem', duration: 245, bpm: 128, key: 'A Major', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Psalm 150:6', plays: '161.5M' },
  { id: 'trk-brandon-lake-2', title: 'Gratitude', artist: 'Brandon Lake', album: 'House of Miracles', genre: 'worship', genreLabel: 'Acoustic Worship', duration: 312, bpm: 78, key: 'B Major', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Psalm 100:4', plays: '185.2M' },
  { id: 'trk-brandon-lake-3', title: 'Hard Fought Hallelujah', artist: 'Brandon Lake', album: 'Coat of Many Colors', genre: 'worship', genreLabel: 'Southern Worship Rock', duration: 258, bpm: 132, key: 'E Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Job 13:15', plays: '64.6M' },
  { id: 'trk-wickham-1', title: 'Battle Belongs', artist: 'Phil Wickham', album: 'Hymn of Heaven', genre: 'worship', genreLabel: 'Praise & Worship', duration: 286, bpm: 130, key: 'Db Major', origin: 'Verified Artist', platform: 'Apple Music', verse: '2 Chronicles 20:15', plays: '92.8M' },
  { id: 'trk-wickham-2', title: 'House of the Lord', artist: 'Phil Wickham', album: 'Hymn of Heaven', genre: 'worship', genreLabel: 'Upbeat Praise', duration: 254, bpm: 126, key: 'Bb Major', origin: 'Verified Artist', platform: 'Spotify', verse: 'Psalm 122:1', plays: '79.1M' },
  { id: 'trk-elevation-1', title: 'LION', artist: 'Elevation Worship & Brandon Lake', album: 'LION', genre: 'worship', genreLabel: 'Arena Worship Rock', duration: 342, bpm: 134, key: 'F# Minor', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Revelation 5:5', plays: '87.3M' },
  { id: 'trk-elevation-2', title: 'RATTLE!', artist: 'Elevation Worship', album: 'Graves Into Gardens', genre: 'worship', genreLabel: 'Modern Worship', duration: 318, bpm: 124, key: 'Eb Major', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Ezekiel 37:7', plays: '99.0M' },
  { id: 'trk-josiah-queen-1', title: 'The Prodigal', artist: 'Josiah Queen', album: 'The Prodigal', genre: 'worship', genreLabel: 'Christian Indie Folk', duration: 196, bpm: 134, key: 'G Major', origin: 'Verified Artist', platform: 'Spotify', verse: 'Luke 15:20', plays: '66.8M' },
  { id: 'trk-seph-1', title: 'Counting My Blessings', artist: 'Seph Schlueter', album: 'Counting My Blessings', genre: 'worship', genreLabel: 'Contemporary Christian', duration: 210, bpm: 118, key: 'C Major', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Psalm 103:2', plays: '51.4M' },
  { id: 'trk-lauren-daigle-1', title: 'You Say', artist: 'Lauren Daigle', album: 'Look Up Child', genre: 'worship', genreLabel: 'Soulful Worship Pop', duration: 274, bpm: 76, key: 'F Major', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Ephesians 2:10', plays: '345.0M' },
  { id: 'trk-maverick-1', title: 'Jireh', artist: 'Elevation Worship & Maverick City Music', album: 'Old Church Basement', genre: 'worship', genreLabel: 'Gospel Worship', duration: 358, bpm: 74, key: 'Db Major', origin: 'Verified Artist', platform: 'Spotify', verse: 'Matthew 6:26', plays: '198.4M' },
  { id: 'trk-cece-1', title: 'Goodness of God', artist: 'CeCe Winans', album: 'Believe For It', genre: 'worship', genreLabel: 'Gospel Worship', duration: 296, bpm: 72, key: 'Ab Major', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Psalm 23:6', plays: '210.2M' },

  // GOSPEL R&B & NEO-SOUL
  { id: 'trk-sondae-rnb-1', title: 'Holding On', artist: 'Sondae', album: 'Sacred Soul', genre: 'rnb', genreLabel: 'Christian R&B / Soul', duration: 212, bpm: 92, key: 'Eb Major', origin: 'Verified Artist', platform: 'Spotify', verse: 'Psalm 46:10', plays: '24.1M' },
  { id: 'trk-mcreynolds-1', title: 'Make Room', artist: 'Jonathan McReynolds', album: 'Make Room', genre: 'rnb', genreLabel: 'Gospel R&B', duration: 234, bpm: 90, key: 'D Major', origin: 'Verified Artist', platform: 'YouTube Music', verse: '2 Corinthians 12:9', plays: '42.5M' },
  { id: 'trk-kirk-1', title: 'Love Theory', artist: 'Kirk Franklin', album: 'LONG LIVE LOVE', genre: 'rnb', genreLabel: 'Gospel Funk / R&B', duration: 228, bpm: 116, key: 'F Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: '1 John 4:19', plays: '58.9M' },
  { id: 'trk-madison-1', title: 'Mirror', artist: 'Madison Ryann Ward', album: 'A New Thing', genre: 'rnb', genreLabel: 'Soul / Christian R&B', duration: 205, bpm: 84, key: 'Bb Major', origin: 'Verified Artist', platform: 'Spotify', verse: '2 Corinthians 3:18', plays: '39.3M' },

  // BIKE CADENCE & CALISTHENICS EDM
  { id: 'trk-capital-kings-1', title: 'Fireblazin', artist: 'Capital Kings', album: 'II', genre: 'workout-edm', genreLabel: 'Christian Electronic / D&B', duration: 206, bpm: 168, key: 'F# Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Hebrews 12:1', plays: '25.3M' },
  { id: 'trk-capital-kings-2', title: 'Into Your Arms', artist: 'Capital Kings', album: 'II', genre: 'workout-edm', genreLabel: 'Christian EDM', duration: 212, bpm: 140, key: 'A Minor', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Deuteronomy 33:27', plays: '21.4M' },
  { id: 'trk-gui-brazil-1', title: 'Alive', artist: 'Hillsong Young & Free', album: 'We Are Young & Free', genre: 'workout-edm', genreLabel: 'Christian Dance / EDM', duration: 218, bpm: 136, key: 'E Major', origin: 'Verified Artist', platform: 'YouTube Music', verse: 'Ephesians 2:5', plays: '67.8M' },
  { id: 'trk-matthew-parker-1', title: 'Adventure', artist: 'Matthew Parker', album: 'Adventure', genre: 'workout-edm', genreLabel: 'Christian Melodic Bass', duration: 202, bpm: 155, key: 'C Minor', origin: 'Verified Artist', platform: 'Spotify', verse: 'Psalm 16:11', plays: '12.9M' },
  { id: 'trk-colton-dixon-1', title: 'Build a Boat', artist: 'Colton Dixon', album: 'Canvas', genre: 'ai-originals', genreLabel: 'Christian Anthemic Pop', duration: 205, bpm: 142, key: 'G Major', origin: 'Verified Artist', platform: 'Apple Music', verse: 'Hebrews 11:7', plays: '49.2M' },
  { id: 'trk-mercyme-1', title: 'Even If', artist: 'MercyMe', album: 'Lifer', genre: 'ai-originals', genreLabel: 'Contemporary Christian', duration: 254, bpm: 120, key: 'C Major', origin: 'Verified Artist', platform: 'Spotify', verse: 'Daniel 3:17-18', plays: '132.4M' },
];

const VERIFIED_YOUTUBE_CANDIDATES_BY_ID: Record<string, string[]> = {
  // Kamban
  'trk-kamban-1': ['NMkpAZMrFjs', 'ok4x1zHdy-Y', 'ud2zs4bmmlQ'],
  'trk-kamban-2': ['ud2zs4bmmlQ', 'NMkpAZMrFjs', 'ok4x1zHdy-Y'],
  'trk-kamban-3': ['ok4x1zHdy-Y', 'NMkpAZMrFjs', 'wgbNNXf-ywk'],
  'trk-kamban-4': ['wgbNNXf-ywk', 'NMkpAZMrFjs', 'fcw-3QZj3oQ'],
  'trk-kamban-5': ['fcw-3QZj3oQ', 'wgbNNXf-ywk', 'ok4x1zHdy-Y'],
  'trk-kamban-6': ['KCkmQ2QToHE', 'NMkpAZMrFjs', 'ud2zs4bmmlQ'],

  // T-Strike
  'trk-tstrike-1': ['aYPpN-FPs30', 'XoR5KYrWCNo', 'UvaVjcsQrXw'],
  'trk-tstrike-2': ['XoR5KYrWCNo', 'aYPpN-FPs30', 'GmAf-9dqdEs'],
  'trk-tstrike-3': ['GmAf-9dqdEs', 'aYPpN-FPs30', 'jn-MHI_M1sc'],
  'trk-tstrike-4': ['jn-MHI_M1sc', 'GmAf-9dqdEs', 'd8Z1DbW06q4'],
  'trk-tstrike-5': ['d8Z1DbW06q4', 'aYPpN-FPs30', 'ahBi3vGpWPg'],
  'trk-tstrike-6': ['ahBi3vGpWPg', 'XoR5KYrWCNo', 'aYPpN-FPs30'],

  // Bloodrage
  'trk-bloodrage-1': ['AWd5Q5ZnmLM', 'yhGiyVoJa80', 'ZTRAZmoozWs', 'u6NOhdN7Flo'],
  'trk-bloodrage-2': ['u6NOhdN7Flo', 'AWd5Q5ZnmLM', 'gz7MK4EDiw4'],
  'trk-bloodrage-3': ['gz7MK4EDiw4', 'AWd5Q5ZnmLM', 'u6NOhdN7Flo'],
  'trk-bloodrage-4': ['J5S_9fwom5M', 'AWd5Q5ZnmLM', 'u6NOhdN7Flo'],

  // Demon Hunter & Metal/Hardcore
  'trk-demon-hunter-3': ['w_zeZVBvGWU', 'HDZc98fLaWo', 'CpGRn8CD7Es'],
  'trk-demon-hunter-1': ['n0l0YOHO5jg', 'gSX2Xo4ApZA', '-ecck4fj12c', 'NNNPgIfK2YE'],
  'trk-demon-hunter-2': ['QJfI4PlxjfM', 'M37uCVmZHd8', 'zKCP2vWQehc', 'DB9HOfodpfg'],
  'trk-demon-hunter-4': ['boqLaWl_xjI', 'HZyE9QApvEU', 'lmjORMDGsNA'],
  'trk-demon-hunter-5': ['TXqtk_wBu8I', 'Tu52H0b9J80', '8XDCfPw_avA'],
  'trk-demon-hunter-6': ['IcFRo6KoiaQ', 'YhtwUk3QagQ', 'nBvgoCL9lq4'],
  'trk-living-sacrifice-1': ['AQSZVgIQP4Y', 'vwQZO9dEjfQ', '5NlMJrOZqyA'],
  'trk-war-of-ages-1': ['nG7INQrulxU', 'steheFrwluA', 'f8q60PSzk90'],
  'trk-impending-doom-1': ['85SUCBCD5Rk', 'nRbTwUcPT8Q', 'R917CzhQMMs'],
  'trk-stryper-1': ['A96oWoLhdSQ', 'uayMplji28o', 'mIwX5SHQPYg'],
  'trk-mortification-1': ['C3TibfE0boQ', 'RFPNExnpL4w', 'FljaRw5AxsU'],

  // Bryann T, T-Bone, Gospel Gangstaz, Country, Punk/Ska, Reggae
  'trk-bryannt-1': ['MLSw2nBrcKY', 'DkqaIulFAFU', 'FCSCcawRno0'],
  'trk-bryannt-2': ['DkqaIulFAFU', 'MLSw2nBrcKY', 'FCSCcawRno0'],
  'trk-tbone-1': ['LZVNkwIhSGE', 'oFxx_9Meu8s', 'p_lZWI_JzKQ'],
  'trk-gospel-gangstaz-1': ['7AoQooITqjM', 'KP5yzqtRwfU'],
  'trk-zach-williams-1': ['JGYjKR69M6U', 'afth0fQPjnM', '6WtV1XtqsW0'],
  'trk-crowder-1': ['yjgioXrnEME', 'HELQyZNnR-g', 'r2zhf2mqEMI'],
  'trk-mxpx-1': ['SPcDyl6tCV8', 'OLN6u0h7ahA', 'p8-s4B_BTm0'],
  'trk-relientk-1': ['MkHuUgJC1ok', 'YB3cINTFKGY', 'ErE6xSXDkoQ'],
  'trk-supertones-1': ['9YQZLy_Fxus', 'B8dD0EtzVS0', '-QbwuLYMmzs'],
  'trk-christafari-1': ['yrukH62mxMk', 'MCKp8Tn6Cok', 'UVGZqZVzel4'],

  // Rock, CHH, Worship, R&B, EDM
  'trk-skillet-1': ['J4JisubEvSI', 'Sf9NSd_2avA', 'IvYLtvRe-us', 'WLLLvQRkdrY'],
  'trk-skillet-2': ['MUdIKF4V4m8', 'Na_LRWNbyJ8', 'pOmWbRMmRHk', 'eVsvih0rrWc'],
  'trk-skillet-3': ['7yeksMKVOno', 'MUdIKF4V4m8', 'v2QpQmyafQA', 'cP0e3-4CfDw'],
  'trk-skillet-4': ['93_5WFaH5Yc', '9aRlxHtB0pg', 'NTKRd8q1iCU', 'YZEYCHYx9MI'],
  'trk-skillet-5': ['MKlvqLzTU18', 'k4eQeMK4hHQ', 'ODOBeA8OtUw', 'hAXCNeAk7-0'],
  'trk-skillet-6': ['jP_uUkBfCM4', 'SKnRdQiH3-k', '7qT3oqRixTA', 'Q-JK2ZgkFrU'],
  'trk-red-1': ['Xte6Ig-H04s', 'xu76NQCLMf4', 'iES39Nb0cgw', 'cJpeNf9LRnE'],
  'trk-red-2': ['KqJlIx2ig_g', '0SJPCdafnLo', 'xFsFhShSJn4', 'MENjdpdif9Y'],
  'trk-red-3': ['8ZkCtmPHpT4', 'I7BaFAromz4', 'mxJdyNx_zxg', 'b2vIWub0XNY'],
  'trk-tfk-1': ['6lNBsqUtfKc', 'EqcuP5KorfM', 'hxqW1Eq0iP4', 'YGGNXZ0mcro'],
  'trk-tfk-2': ['nDz5SzpA3Xw', 'hW3EeWRv898', 'Q-QhBfDnyNY', 'HdnTSXUWd3E'],
  'trk-tfk-3': ['uVBQYow1X5g', 'V0yL4MODEcQ', 'U0wDohDC83w', 'jSD5vSSGLOM'],
  'trk-disciple-1': ['LnpQqYqQtr8', '93lGFvoucdg', '_SgNkQ9fa3A', 'cx-KD-wHzug'],
  'trk-disciple-2': ['d9yIZnypqBk', 'U4RydIbxEiY', 'GZBEFFWnX7c', 'z7MZpv6OO5Q'],
  'trk-flyleaf-1': ['Bl1AXYOseuY', '2lfSWuJDfOE', 'xN0FFK8JSYE', 'PhJWPl3AyUI'],
  'trk-flyleaf-2': ['NHXYKpHG7Rk', 'xN0FFK8JSYE', 'E8V8YKALT-0', 'iWIADZKU9dw'],
  'trk-wolves-1': ['sfpzJ3Q7ix0', 'n5ZlDC5qETE', 'dG30knc4DQs', 'CJ2m3CSYnog'],
  'trk-fitforaking-1': ['i9dT0AkB-b4', 'cMbLDpUi3yE', '7Z--9oMjv2M', '7cc6PUA9L-A'],
  'trk-needtobreathe-1': ['KRSLz_KgUsM', 'fra1FQGBpK0', '61Wm_qlVD4Q', 'RzzGL6XNIuw'],
  'trk-switchfoot-1': ['tMPs1DiGTDM', '4fhBEtmTWbQ', 'Rpi_tqn-RW4', 'Ky_prSro9iw'],
  'trk-memphis-1': ['9LA-bmgPTqU', 'nLU3EzJCpA8', 'N3Qz5P-YMdk', 'l90RpXGTmNc'],
  'trk-kutless-1': ['ds8vcSJFe7E', '-jkMnq2Hfzo', '-xko6N1DEXo', 'fDIzvBYdSY8'],
  'trk-pillar-1': ['0HNF2gqokP8', 'LSvOTw8UH6s', 'CZNdAcy6sJ8', 'AL8ZGEyBuNs'],
  'trk-tobymac-1': ['yiUCKeY5QD0', '-z6MmV8xuq0', 'aVgetIvEIAs', 'uAR_H7B5WaM'],
  'trk-tobymac-2': ['MX1G71WK-FA', 'yQpvzX4chmA', 'VfIWEUpFDaY', 'ou-p_RDUbB4'],
  'trk-tobymac-3': ['LWLZ_MrPplk', 'n--EwvW57ds', '2rfue7I686I', '6IZvuuegJ-8'],
  'trk-tobymac-4': ['2pO16yMC19o', 'rHedPe_ZyZA', '3GPmsuJ5S-I', '0PRQX5Bh0zs'],
  'trk-lecrae-1': ['cBngL8ZRyYw', 'IiDOyQCCpKs', 'ajeMW4I6Biw', 'zcFajQKAe48'],
  'trk-lecrae-2': ['CrNwTSgTe7M', 'sSO-XpGkZx4', 'Jv8IqJm6q7w', 'bPsr7Y6TQRY'],
  'trk-lecrae-3': ['h7WR8-aLRS8', 'WopyrETP-CU', '2Rpl5zr44y0', 'N2mqbhpSfdg'],
  'trk-lecrae-4': ['krpdSno_qXI', 'IiDOyQCCpKs', 'nCXWJxdBFmY', 'i58IH2D8sWQ'],
  'trk-kb-1': ['n2N5KkqJv58', 'Gmif95xAOZM', 'AhYt_5ElABc', 'LC4Td0j3h-U'],
  'trk-kb-2': ['VWWOknOy-KE', '242dYB1y0Bs', '5f6Q29S_Azk', 'o3ETVqqSXTc'],
  'trk-kb-3': ['ZJrHleG0-k4', '4-F9i5uNxho', 'l9XFhSngs7I', 'SFgBleymFdQ'],
  'trk-forrest-frank-1': ['eQMVOQUuILc', 'DdF1vVMMIJk', 'jDu_xNTiPlQ', 'YsVJVnVfu6A'],
  'trk-forrest-frank-2': ['1tk_oXc_ozQ', 'T1LRsp8qBY0', 'MAAnsaBwKyE', 'wZdY0yGQOCY'],
  'trk-hulvey-1': ['wCik3Y31z_s', 'OI1Hp1eax1U', '9cZE-_0seRY', 'zweTWjGa3rM'],
  'trk-hulvey-2': ['r-qkgFk9wiI', '-hgD70Rm90k', 'gPUENbTGDbs', '63KIMUw4Mxc'],
  'trk-nf-1': ['H0BXMUdyIKA', 'hePo8LkGIik', 'evLGpLF4B3c', 'a610pff2C8c'],
  'trk-nf-2': ['4tkvuaA0nak', 'ZtXVuiCdhpI', 'YUdkYx9WH9k', 'tsmPCi7NKrg'],
  'trk-caleb-gordon-1': ['qoNpHjmigRQ', 'oZPPDYjLXQU', 'Jz4anNqCJAc', 'dC49_9AzifI'],
  'trk-alex-jean-1': ['WtuXGxENs2k', '2spfhkuiUPQ', 'DbHP7DQ2jIo', 'n9WadPAjKbg'],
  'trk-miles-minnick-1': ['fPs4AlG3_cs', '4_ieWptvlyM', 'VW7FF_hgO28', 'kfs28sd4VLo'],
  'trk-brandon-lake-1': ['raFnjGVkHe8', 'IkHgxKemCRk', 'HI-j9oQMYdU', 'f2oxGYpuLkw'],
  'trk-brandon-lake-2': ['1em6MJp0zUc', 'dQdfs5S6jyA', 'Na6P_kLI2FE', 'UoHrBNTfzIs'],
  'trk-brandon-lake-3': ['lN83y32oTjA', 'KcIMnHf3HyM', '7X0KKWrkfvQ', '72DWAggLh4w'],
  'trk-wickham-1': ['johgSkNj3-A', 'BiPNieLnt0s', 'qtvQNzPHn-w', 'nwz559DuDgA'],
  'trk-wickham-2': ['IqfV0zeEvT8', '1AnSHYjQ3tc', 'R6I5T_rflfk', 'nEdDe7wx_ZY'],
  'trk-elevation-1': ['apZEYgTpZxM', 'hlfqWuaiGAQ', '2go_dOJVwc4', 'UaeEp47naJM'],
  'trk-elevation-2': ['xrAdbH28gIg', 'DraC9OmqINw', 'KwX1f2gYKZ4', 'kDE74QQ3sbA'],
  'trk-josiah-queen-1': ['3B3hC706X90', 'Hk0ZMKqJNWQ', 'GltKjsxKDz4', 'x2qZrDnFs8I'],
  'trk-seph-1': ['aZjWYgq9QfM', '1AnSHYjQ3tc', 'uz0cjGr2h4k', 'c17u2lkSzEI'],
  'trk-lauren-daigle-1': ['HqpNGYbcy3U', 'N8WK9HmF53w', 'sIaT8Jl2zpI', 'q4GeRqf3zdw'],
  'trk-maverick-1': ['w_gCSJI6DKM', 'VjMle273Ed0', 'mC-zw0zCCtg', 'ZErLEnRNfbE'],
  'trk-cece-1': ['-AwLTeMyq20', '9LSN-cAdtTM', '2xcFM9CBiOE', '9sE5kEnitqE'],
  'trk-sondae-rnb-1': ['xShlRAGcPyM', 'C9mHHHDWiwU', 'kHm3b0SSFNY', 'X-EIHAMoQwI'],
  'trk-limoblaze-1': ['C_rjNGjckUc', 'grjYSOqkCzU', 'qmoNzFE09Uw', 'JW2e1VRQY7w'],
  'trk-limoblaze-2': ['2t-ni2eEIEo', 'TZtNUxLxVjs', 'Wa8uJgwZn4Q', '9PlAIDxEKNk'],
  'trk-mcreynolds-1': ['R2fngqWB6kM', 'SiycqP-kCKE', '0paVraKnrh4', '4HcNajDgWsY'],
  'trk-kirk-1': ['z2D87ziuyGw', 'wri2BYGFuw4', 'oqtUIrauH5Y', '3aD8OK07iIY'],
  'trk-madison-1': ['LdLMLhSzz7g', 'IcUMGGdd8gw', 'hvazLHDucPw', 'm80PQ1JX-PE'],
  'trk-calledout-1': ['Y55X3kHVDE8', 'Jv_4BfyH7Dg', 'pEY2JkXX_u8', 'w8flj57BUC4'],
  'trk-capital-kings-1': ['9tIyYD_A6hA', 's97UAeFLePI', 'AWqJhc1LNe4', 'HGzx_f3UnEY'],
  'trk-capital-kings-2': ['gCsqjl2H6C0', 'J8NC1OB8fjc', 'D_0B7POXzSQ', 'b6oCHNizzNY'],
  'trk-gui-brazil-1': ['qEvEVALLjNQ', 'FmS6KURr_FA', 'pPOvOmXGVqM', 'h8WgTS1hft0'],
  'trk-matthew-parker-1': ['8y6sONFwOSw', 'r2bv-lDa8hM', 'Tie2EN2HY80', '0A-z55-tp_M'],
  'trk-colton-dixon-1': ['jjaKKAsQc34', 'yeDh4S_AyfI', '-ky3-duE7d4', 'l3Fl8ngQzWk'],
  'trk-mercyme-1': ['B6fA35Ved-Y', '0nyG29JJoGk', 'nyLrl0SWe7s', 'HwNWGcwKE5Q'],
};

export const INITIAL_TRACKS: Track[] = RAW_SEED_CATALOG.map((item, idx) => {
  const candidates = VERIFIED_YOUTUBE_CANDIDATES_BY_ID[item.id] || [];
  const ytThumb = candidates[0] ? `https://i.ytimg.com/vi/${candidates[0]}/hqdefault.jpg` : undefined;

  const coverUrl =
    ytThumb ||
    (item.genre === 'rock' || item.genre === 'metal-hardcore' || item.genre === 'punk-ska'
      ? COVER_ROCK_ALTAR
      : item.genre === 'hiphop' || item.genre === 'reggae-afro'
      ? COVER_HIPHOP_CROWN
      : item.genre === 'workout-edm' || item.genre === 'ai-originals'
      ? BANNER_CALISTHENICS
      : COVER_WORSHIP_RNB);

  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    album: item.album,
    genre: item.genre,
    genreLabel: item.genreLabel,
    duration: item.duration,
    bpm: item.bpm,
    keySignature: item.key,
    coverUrl,
    youtubeVideoId: candidates[0],
    youtubeCandidates: candidates,
    sourceOrigin: item.origin,
    platformIngestedFrom: item.platform,
    ingestedTimestamp: idx < 10 ? 'Just now' : `${(idx + 1) * 2}m ago`,
    scriptureReference: item.verse,
    lyricsSnippet: [
      `${item.title} — ${item.artist} (${item.album})`,
      `Anchored in ${item.verse} · Full-Length Master Recording at ${item.bpm} BPM.`,
      'Built for strict bodyweight calisthenics, road bike climbs, and daily devotion.',
      'Synced across all your devices via Sanctuary Connect & Offline Vault.',
    ],
    workoutSuitability:
      item.bpm >= 145
        ? ['Calisthenics Strength', 'HIIT Finisher', 'Bike Cadence']
        : item.bpm >= 120
        ? ['Bike Cadence', 'Calisthenics Strength']
        : ['Mobility & Cooldown'],
    hiFiFormat: idx % 3 === 0 ? '24-bit/96kHz FLAC' : idx % 3 === 1 ? 'Spatial Dolby Atmos' : '320kbps AAC',
    playsCount: item.plays,
  };
});

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-calisthenics-iron',
    name: 'Iron Temple: Demon Hunter, Bloodrage & Metalcore',
    description: 'Extreme Christian metal, thrash, and hardcore from Demon Hunter, Bloodrage, Living Sacrifice, War of Ages, Impending Doom, and Skillet.',
    coverUrl: COVER_ROCK_ALTAR,
    category: 'Metal & Calisthenics Strength',
    trackIds: [
      'trk-bloodrage-1',
      'trk-bloodrage-2',
      'trk-demon-hunter-3',
      'trk-demon-hunter-1',
      'trk-demon-hunter-4',
      'trk-demon-hunter-5',
      'trk-living-sacrifice-1',
      'trk-war-of-ages-1',
      'trk-impending-doom-1',
      'trk-skillet-1',
      'trk-skillet-2',
    ],
    isOfflineSaved: true,
    createdBy: 'Sanctuary Coach',
    followersCount: '68.4K',
  },
  {
    id: 'pl-chh-rotation',
    name: 'Street Kingdom CHH: Kamban, T-Strike, Lecrae & Bryann T',
    description: 'Hard-hitting Christian rap & street gospel from Kamban, T-Strike, Bryann T, T-Bone, Gospel Gangstaz, Lecrae, TobyMac, and KB.',
    coverUrl: COVER_HIPHOP_CROWN,
    category: 'Hip-Hop & Street Gospel',
    trackIds: [
      'trk-kamban-1',
      'trk-kamban-2',
      'trk-kamban-3',
      'trk-tstrike-1',
      'trk-tstrike-2',
      'trk-tstrike-3',
      'trk-bryannt-1',
      'trk-tbone-1',
      'trk-gospel-gangstaz-1',
      'trk-lecrae-1',
      'trk-tobymac-1',
      'trk-kb-1',
    ],
    isOfflineSaved: true,
    createdBy: 'Sanctuary Editorial',
    followersCount: '74.2K',
  },
  {
    id: 'pl-bike-cadence',
    name: 'Road & Peloton Cadence: Punk, Ska, Rock & EDM',
    description: 'High-RPM Christian Punk, Ska, EDM, and Southern Rock from MxPx, Relient K, The O.C. Supertones, Capital Kings, and Zach Williams.',
    coverUrl: BANNER_CALISTHENICS,
    category: 'Cycling & Cardio',
    trackIds: [
      'trk-mxpx-1',
      'trk-relientk-1',
      'trk-supertones-1',
      'trk-capital-kings-1',
      'trk-capital-kings-2',
      'trk-zach-williams-1',
      'trk-crowder-1',
      'trk-forrest-frank-2',
    ],
    isOfflineSaved: true,
    createdBy: 'Sanctuary Cycling',
    followersCount: '41.9K',
  },
  {
    id: 'pl-midnight-selah',
    name: 'Midnight Selah: Worship, Reggae & Gospel R&B',
    description: 'Christafari roots reggae, Limoblaze Afro-gospel, Brandon Lake, Lauren Daigle, and Kirk Franklin.',
    coverUrl: COVER_WORSHIP_RNB,
    category: 'Worship, Reggae & R&B',
    trackIds: [
      'trk-christafari-1',
      'trk-limoblaze-1',
      'trk-brandon-lake-2',
      'trk-lauren-daigle-1',
      'trk-mcreynolds-1',
      'trk-kirk-1',
      'trk-cece-1',
    ],
    isOfflineSaved: false,
    createdBy: 'Sanctuary Worship',
    followersCount: '55.1K',
  },
];

// Queries across ALL Christian genres for continuous non-stop forever discovery
const CHRISTIAN_ARTIST_SEEDS: {
  query: string;
  genre: Exclude<ChristianGenre, 'all'>;
  genreLabel: string;
  platform: PlatformSource;
  bpmEstimate: number;
  scripture: string;
}[] = [
  { query: 'Kamban Christian Rap', genre: 'hiphop', genreLabel: 'Street Christian Hip-Hop', platform: 'YouTube Music', bpmEstimate: 148, scripture: 'Philippians 3:14' },
  { query: 'T-Strike Christian Rap', genre: 'hiphop', genreLabel: 'Hardcore CHH', platform: 'YouTube Music', bpmEstimate: 150, scripture: '1 Corinthians 15:57' },
  { query: 'BLOODRAGE metal', genre: 'metal-hardcore', genreLabel: 'Christian Heavy Metal', platform: 'YouTube Music', bpmEstimate: 172, scripture: 'Psalm 18:2' },
  { query: 'Demon Hunter', genre: 'metal-hardcore', genreLabel: 'Christian Metalcore', platform: 'YouTube Music', bpmEstimate: 164, scripture: 'Hebrews 13:5' },
  { query: 'Living Sacrifice metal', genre: 'metal-hardcore', genreLabel: 'Christian Thrash / Groove Metal', platform: 'Spotify', bpmEstimate: 174, scripture: 'Romans 12:1' },
  { query: 'War of Ages metal', genre: 'metal-hardcore', genreLabel: 'Christian Melodic Metalcore', platform: 'YouTube Music', bpmEstimate: 176, scripture: 'Hebrews 12:29' },
  { query: 'Impending Doom metal', genre: 'metal-hardcore', genreLabel: 'Christian Deathcore', platform: 'YouTube Music', bpmEstimate: 180, scripture: 'Colossians 2:14' },
  { query: 'Bryann T Kingdom Muzic', genre: 'hiphop', genreLabel: 'Street Gospel Rap', platform: 'YouTube Music', bpmEstimate: 140, scripture: 'Jeremiah 29:11' },
  { query: 'Stryper', genre: 'metal-hardcore', genreLabel: 'Classic Christian Metal', platform: 'Apple Music', bpmEstimate: 152, scripture: 'Isaiah 53:5' },
  { query: 'Mortification metal', genre: 'metal-hardcore', genreLabel: 'Christian Thrash / Death Metal', platform: 'YouTube Music', bpmEstimate: 175, scripture: 'Revelation 20:10' },
  { query: 'Theocracy metal', genre: 'metal-hardcore', genreLabel: 'Christian Power Metal', platform: 'YouTube Music', bpmEstimate: 168, scripture: 'Revelation 19:16' },
  { query: 'Tourniquet metal', genre: 'metal-hardcore', genreLabel: 'Christian Progressive Thrash', platform: 'Spotify', bpmEstimate: 165, scripture: '1 Kings 18:21' },
  { query: 'Phinehas metalcore', genre: 'metal-hardcore', genreLabel: 'Christian Metalcore', platform: 'YouTube Music', bpmEstimate: 172, scripture: 'Numbers 25:11' },
  { query: 'For Today metalcore', genre: 'metal-hardcore', genreLabel: 'Christian Hardcore / Metalcore', platform: 'Spotify', bpmEstimate: 170, scripture: 'Joshua 24:15' },
  { query: 'Becoming the Archetype', genre: 'metal-hardcore', genreLabel: 'Christian Progressive Death Metal', platform: 'YouTube Music', bpmEstimate: 174, scripture: 'Psalm 46:1' },
  { query: 'August Burns Red', genre: 'metal-hardcore', genreLabel: 'Christian Metalcore', platform: 'Spotify', bpmEstimate: 168, scripture: 'Proverbs 27:17' },
  { query: 'The Devil Wears Prada metalcore', genre: 'metal-hardcore', genreLabel: 'Christian Post-Hardcore / Metalcore', platform: 'YouTube Music', bpmEstimate: 164, scripture: '1 Peter 5:8' },
  { query: 'Extol metal', genre: 'metal-hardcore', genreLabel: 'Christian Progressive Metal', platform: 'Spotify', bpmEstimate: 166, scripture: 'Psalm 145:1' },
  { query: 'Zao metalcore', genre: 'metal-hardcore', genreLabel: 'Christian Hardcore', platform: 'YouTube Music', bpmEstimate: 170, scripture: 'Revelation 3:16' },
  { query: 'Bloodgood Christian metal', genre: 'metal-hardcore', genreLabel: 'Classic Christian Heavy Metal', platform: 'YouTube Music', bpmEstimate: 154, scripture: 'Luke 23:34' },
  { query: 'Deliverance thrash metal', genre: 'metal-hardcore', genreLabel: 'Christian Speed / Thrash Metal', platform: 'YouTube Music', bpmEstimate: 178, scripture: 'Psalm 18:2' },
  { query: 'T-Bone Christian Rap', genre: 'hiphop', genreLabel: 'West Coast CHH', platform: 'YouTube Music', bpmEstimate: 146, scripture: 'Psalm 23:4' },
  { query: 'Gospel Gangstaz', genre: 'hiphop', genreLabel: 'Classic Street CHH', platform: 'Spotify', bpmEstimate: 138, scripture: 'John 9:25' },
  { query: 'Cross Movement Christian Rap', genre: 'hiphop', genreLabel: 'East Coast Lyrical CHH', platform: 'Apple Music', bpmEstimate: 142, scripture: 'Romans 1:16' },
  { query: 'Grits Christian Hip Hop', genre: 'hiphop', genreLabel: 'Southern CHH', platform: 'Spotify', bpmEstimate: 136, scripture: 'Psalm 118:24' },
  { query: 'Bizzle God Over Money', genre: 'hiphop', genreLabel: 'Hardcore Lyrical CHH', platform: 'YouTube Music', bpmEstimate: 144, scripture: 'Matthew 6:24' },
  { query: 'Zauntee', genre: 'hiphop', genreLabel: 'High-Energy Workout CHH', platform: 'YouTube Music', bpmEstimate: 154, scripture: 'Joshua 1:9' },
  { query: '1K Phew', genre: 'hiphop', genreLabel: 'Atlanta Trap Gospel', platform: 'Spotify', bpmEstimate: 148, scripture: 'Psalm 27:1' },
  { query: 'Nobigdyl', genre: 'hiphop', genreLabel: 'Indie Tribe CHH', platform: 'Apple Music', bpmEstimate: 142, scripture: 'John 8:32' },
  { query: 'Eshon Burgundy', genre: 'hiphop', genreLabel: 'Boom-Bap Street CHH', platform: 'YouTube Music', bpmEstimate: 138, scripture: 'Romans 8:37' },
  { query: 'Zach Williams Christian', genre: 'country-southern', genreLabel: 'Christian Country Rock', platform: 'Apple Music', bpmEstimate: 120, scripture: 'John 8:36' },
  { query: 'Anne Wilson Christian Country', genre: 'country-southern', genreLabel: 'Christian Country', platform: 'Spotify', bpmEstimate: 118, scripture: 'Matthew 6:10' },
  { query: 'We The Kingdom', genre: 'country-southern', genreLabel: 'Southern Worship Rock', platform: 'Apple Music', bpmEstimate: 124, scripture: 'Psalm 100:2' },
  { query: 'Rhett Walker', genre: 'country-southern', genreLabel: 'Christian Southern Rock', platform: 'Spotify', bpmEstimate: 122, scripture: 'Romans 15:13' },
  { query: 'CAIN Christian', genre: 'country-southern', genreLabel: 'Christian Country Harmony', platform: 'Apple Music', bpmEstimate: 118, scripture: 'Isaiah 43:2' },
  { query: 'MxPx punk', genre: 'punk-ska', genreLabel: 'Christian Punk Rock', platform: 'YouTube Music', bpmEstimate: 166, scripture: 'Psalm 119:9' },
  { query: 'Relient K', genre: 'punk-ska', genreLabel: 'Christian Pop-Punk', platform: 'Spotify', bpmEstimate: 156, scripture: 'Psalm 32:7' },
  { query: 'The O.C. Supertones', genre: 'punk-ska', genreLabel: 'Christian Ska-Punk', platform: 'YouTube Music', bpmEstimate: 164, scripture: 'Ephesians 6:12' },
  { query: 'Five Iron Frenzy', genre: 'punk-ska', genreLabel: 'Christian Ska', platform: 'Spotify', bpmEstimate: 168, scripture: 'Micah 6:8' },
  { query: 'Hawk Nelson', genre: 'punk-ska', genreLabel: 'Christian Pop-Punk', platform: 'Apple Music', bpmEstimate: 160, scripture: 'Philippians 4:13' },
  { query: 'Emery post hardcore', genre: 'rock', genreLabel: 'Christian Post-Hardcore', platform: 'Spotify', bpmEstimate: 158, scripture: 'Psalm 51:10' },
  { query: 'Anberlin', genre: 'rock', genreLabel: 'Christian Alt Rock', platform: 'Apple Music', bpmEstimate: 148, scripture: '1 Corinthians 13:13' },
  { query: 'Project 86 rock', genre: 'rock', genreLabel: 'Christian Hardcore Rock', platform: 'YouTube Music', bpmEstimate: 156, scripture: 'Romans 12:2' },
  { query: 'P.O.D. Payable On Death', genre: 'rock', genreLabel: 'Christian Nu-Metal / Rock', platform: 'Spotify', bpmEstimate: 152, scripture: 'Psalm 23:4' },
  { query: 'Blindside Christian rock', genre: 'rock', genreLabel: 'Christian Post-Hardcore', platform: 'YouTube Music', bpmEstimate: 158, scripture: 'Psalm 139:14' },
  { query: 'Underoath', genre: 'metal-hardcore', genreLabel: 'Christian Post-Hardcore / Metalcore', platform: 'Spotify', bpmEstimate: 164, scripture: 'Psalm 40:2' },
  { query: 'Christafari reggae', genre: 'reggae-afro', genreLabel: 'Christian Reggae & Dub', platform: 'YouTube Music', bpmEstimate: 116, scripture: 'Psalm 150:6' },
  { query: 'Papa San gospel reggae', genre: 'reggae-afro', genreLabel: 'Christian Dancehall & Reggae', platform: 'Spotify', bpmEstimate: 118, scripture: 'Psalm 47:1' },
  { query: 'Sherwin Gardner Caribbean gospel', genre: 'reggae-afro', genreLabel: 'Afro-Caribbean Gospel', platform: 'Apple Music', bpmEstimate: 114, scripture: 'Jeremiah 29:11' },
  { query: 'Limoblaze', genre: 'reggae-afro', genreLabel: 'Afro-Gospel', platform: 'Spotify', bpmEstimate: 112, scripture: 'Philippians 4:19' },
  { query: 'Guvna B', genre: 'hiphop', genreLabel: 'UK Christian Grime & Rap', platform: 'Spotify', bpmEstimate: 142, scripture: 'Psalm 23:1' },
  { query: 'TobyMac', genre: 'hiphop', genreLabel: 'Christian Hip-Hop / Pop', platform: 'Apple Music', bpmEstimate: 136, scripture: 'Psalm 27:1' },
  { query: 'Lecrae', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', platform: 'Spotify', bpmEstimate: 146, scripture: 'Romans 1:16' },
  { query: 'Skillet', genre: 'rock', genreLabel: 'Christian Hard Rock', platform: 'YouTube Music', bpmEstimate: 154, scripture: 'Joshua 1:9' },
  { query: 'Brandon Lake', genre: 'worship', genreLabel: 'Modern Worship', platform: 'Apple Music', bpmEstimate: 126, scripture: 'Psalm 103:1' },
  { query: 'KB Christian Rap', genre: 'hiphop', genreLabel: 'Christian Trap / CHH', platform: 'Spotify', bpmEstimate: 152, scripture: '1 Corinthians 15:57' },
  { query: 'Thousand Foot Krutch', genre: 'rock', genreLabel: 'Christian Rock', platform: 'YouTube Music', bpmEstimate: 158, scripture: 'Isaiah 54:17' },
  { query: 'Red Christian Rock', genre: 'rock', genreLabel: 'Christian Alt Metal', platform: 'YouTube Music', bpmEstimate: 150, scripture: 'Psalm 34:18' },
  { query: 'Disciple Rock', genre: 'rock', genreLabel: 'Christian Heavy Rock', platform: 'Spotify', bpmEstimate: 160, scripture: 'Romans 8:37' },
  { query: 'Wolves At The Gate', genre: 'rock', genreLabel: 'Christian Post-Hardcore', platform: 'YouTube Music', bpmEstimate: 162, scripture: 'Isaiah 61:1' },
  { query: 'Forrest Frank', genre: 'hiphop', genreLabel: 'Christian Pop / CHH', platform: 'Apple Music', bpmEstimate: 134, scripture: 'Psalm 118:24' },
  { query: 'Hulvey', genre: 'hiphop', genreLabel: 'Christian Hip-Hop', platform: 'Spotify', bpmEstimate: 142, scripture: 'John 16:33' },
  { query: 'Elevation Worship', genre: 'worship', genreLabel: 'Praise & Worship', platform: 'Apple Music', bpmEstimate: 128, scripture: 'Psalm 95:1' },
  { query: 'Phil Wickham', genre: 'worship', genreLabel: 'Modern Worship', platform: 'Spotify', bpmEstimate: 128, scripture: '2 Chronicles 20:15' },
  { query: 'Josiah Queen', genre: 'worship', genreLabel: 'Christian Indie Folk', platform: 'Spotify', bpmEstimate: 134, scripture: 'Luke 15:20' },
  { query: 'Jonathan McReynolds', genre: 'rnb', genreLabel: 'Gospel R&B', platform: 'Apple Music', bpmEstimate: 94, scripture: 'Lamentations 3:22-23' },
  { query: 'Tye Tribbett', genre: 'rnb', genreLabel: 'High-Energy Gospel Choir & Funk', platform: 'Spotify', bpmEstimate: 128, scripture: 'Psalm 150:1' },
  { query: 'Capital Kings', genre: 'workout-edm', genreLabel: 'Christian Electronic / D&B', platform: 'Spotify', bpmEstimate: 164, scripture: 'Hebrews 12:1' },
  { query: 'Gawvi', genre: 'workout-edm', genreLabel: 'Christian EDM & Trap Bass', platform: 'Apple Music', bpmEstimate: 150, scripture: 'Psalm 149:3' },
];

function inferGenreFromText(text: string): Exclude<ChristianGenre, 'all'> {
  const lower = text.toLowerCase();
  if (
    lower.includes('metal') ||
    lower.includes('demon hunter') ||
    lower.includes('bloodrage') ||
    lower.includes('living sacrifice') ||
    lower.includes('impending doom') ||
    lower.includes('war of ages') ||
    lower.includes('mortification') ||
    lower.includes('stryper') ||
    lower.includes('thrash') ||
    lower.includes('hardcore') ||
    lower.includes('phinehas') ||
    lower.includes('for today') ||
    lower.includes('august burns red') ||
    lower.includes('devil wears prada') ||
    lower.includes('underoath') ||
    lower.includes('tourniquet') ||
    lower.includes('theocracy')
  ) {
    return 'metal-hardcore';
  }
  if (
    lower.includes('kamban') ||
    lower.includes('t-strike') ||
    lower.includes('t strike') ||
    lower.includes('bryann') ||
    lower.includes('t-bone') ||
    lower.includes('gospel gangstaz') ||
    lower.includes('hip-hop') ||
    lower.includes('rap') ||
    lower.includes('lecrae') ||
    lower.includes('tobymac') ||
    lower.includes('hulvey') ||
    lower.includes('forrest frank') ||
    lower.includes('kb') ||
    lower.includes('bizzle') ||
    lower.includes('zauntee') ||
    lower.includes('1k phew')
  ) {
    return 'hiphop';
  }
  if (
    lower.includes('punk') ||
    lower.includes('ska') ||
    lower.includes('mxpx') ||
    lower.includes('relient k') ||
    lower.includes('supertones') ||
    lower.includes('five iron') ||
    lower.includes('hawk nelson')
  ) {
    return 'punk-ska';
  }
  if (
    lower.includes('country') ||
    lower.includes('southern') ||
    lower.includes('zach williams') ||
    lower.includes('crowder') ||
    lower.includes('anne wilson') ||
    lower.includes('needtobreathe') ||
    lower.includes('we the kingdom') ||
    lower.includes('rhett walker')
  ) {
    return 'country-southern';
  }
  if (
    lower.includes('reggae') ||
    lower.includes('christafari') ||
    lower.includes('afro') ||
    lower.includes('limoblaze') ||
    lower.includes('papa san') ||
    lower.includes('sherwin gardner')
  ) {
    return 'reggae-afro';
  }
  if (
    lower.includes('rock') ||
    lower.includes('skillet') ||
    lower.includes('red ') ||
    lower.includes('krutch') ||
    lower.includes('disciple') ||
    lower.includes('flyleaf') ||
    lower.includes('p.o.d') ||
    lower.includes('project 86') ||
    lower.includes('blindside') ||
    lower.includes('emery') ||
    lower.includes('anberlin')
  ) {
    return 'rock';
  }
  if (
    lower.includes('r&b') ||
    lower.includes('soul') ||
    lower.includes('kirk franklin') ||
    lower.includes('mcreynolds') ||
    lower.includes('tye tribbett')
  ) {
    return 'rnb';
  }
  if (lower.includes('edm') || lower.includes('dance') || lower.includes('capital kings') || lower.includes('gawvi')) {
    return 'workout-edm';
  }
  return 'worship';
}

function mapItunesItemToTrack(
  item: any,
  idx: number,
  genre: Exclude<ChristianGenre, 'all'>,
  genreLabel: string,
  platform: PlatformSource,
  bpmEstimate: number,
  scripture: string
): Track {
  const hiResArtwork = item.artworkUrl100
    ? String(item.artworkUrl100).replace('100x100bb', '600x600bb')
    : genre === 'rock' || genre === 'metal-hardcore'
    ? COVER_ROCK_ALTAR
    : genre === 'hiphop'
    ? COVER_HIPHOP_CROWN
    : COVER_WORSHIP_RNB;

  const durationSec = item.trackTimeMillis
    ? Math.max(150, Math.round(item.trackTimeMillis / 1000))
    : 215;

  const bpm = bpmEstimate + ((idx * 4) % 14) - 6;
  const fullSongStream = `/api/music/full-song?title=${encodeURIComponent(
    item.trackName
  )}&artist=${encodeURIComponent(item.artistName)}`;

  return {
    id: `live-itunes-${item.trackId}`,
    title: item.trackName,
    artist: item.artistName,
    album: item.collectionName || 'Single Release',
    genre,
    genreLabel: item.primaryGenreName ? `${item.primaryGenreName} · ${genreLabel}` : genreLabel,
    duration: durationSec,
    bpm,
    keySignature: idx % 2 === 0 ? 'D Minor' : 'G Major',
    coverUrl: hiResArtwork,
    audioPreviewUrl: fullSongStream,
    directStreamUrl: item.previewUrl || undefined,
    sourceOrigin: 'Verified Artist',
    platformIngestedFrom: platform,
    ingestedTimestamp: 'Live Forever Stream',
    scriptureReference: scripture,
    lyricsSnippet: [
      `${item.trackName} — full-length verified stream by ${item.artistName}.`,
      `Album: ${item.collectionName || 'Christian Release'}`,
      `Anchored in ${scripture} · Synced at ${bpm} BPM for training & devotion.`,
      'Full-length master recording indexed automatically via Sanctuary Forever Radar.',
    ],
    workoutSuitability:
      bpm >= 140
        ? ['Calisthenics Strength', 'HIIT Finisher', 'Bike Cadence']
        : ['Bike Cadence', 'Mobility & Cooldown'],
    hiFiFormat: '24-bit/96kHz FLAC',
    playsCount: `${((item.trackId % 85) + 12) / 10}M`,
  };
}

function mapYouTubeRichItemToTrack(
  item: {
    videoId: string;
    title: string;
    artist: string;
    durationSeconds: number;
    thumbnailUrl: string;
  },
  idx: number,
  fallbackGenre?: Exclude<ChristianGenre, 'all'>,
  fallbackGenreLabel?: string
): Track {
  const inferredGenre =
    fallbackGenre || inferGenreFromText(`${item.artist} ${item.title}`);
  const bpm =
    inferredGenre === 'metal-hardcore'
      ? 168
      : inferredGenre === 'punk-ska'
      ? 162
      : inferredGenre === 'rock'
      ? 152
      : inferredGenre === 'hiphop'
      ? 144
      : 124;

  const fullSongStream = `/api/music/full-song?title=${encodeURIComponent(
    item.title
  )}&artist=${encodeURIComponent(item.artist)}`;

  return {
    id: `yt-everywhere-${item.videoId}`,
    title: item.title,
    artist: item.artist,
    album: 'Full-Length Master Stream',
    genre: inferredGenre,
    genreLabel: fallbackGenreLabel || `Christian ${inferredGenre.toUpperCase()}`,
    duration: Math.max(150, item.durationSeconds || 225),
    bpm: bpm + ((idx * 3) % 10),
    keySignature: idx % 2 === 0 ? 'C Minor' : 'D Minor',
    coverUrl: item.thumbnailUrl || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
    audioPreviewUrl: fullSongStream,
    youtubeVideoId: item.videoId,
    youtubeCandidates: [item.videoId],
    sourceOrigin: 'Verified Artist',
    platformIngestedFrom: 'YouTube Music',
    ingestedTimestamp: 'Just indexed',
    scriptureReference: 'Psalm 144:1',
    lyricsSnippet: [
      `${item.title} — ${item.artist}`,
      'Full-length master recording streamed directly via Sanctuary Universal Index.',
      'Ready for hardcore calisthenics sets, bike cadence intervals, and offline vault.',
    ],
    workoutSuitability: ['Calisthenics Strength', 'HIIT Finisher', 'Bike Cadence'],
    hiFiFormat: '24-bit/96kHz FLAC',
    playsCount: 'Full Song Master',
  };
}

const FOREVER_SEARCH_MODIFIERS = [
  '',
  'lyrics',
  'official audio',
  'album',
  'full song',
  'live',
  'anthem',
  'remix',
  'acoustic',
  'workout',
  'new release',
  'deluxe',
];

export async function fetchLiveChristianMusicBatch(seedIndex: number): Promise<Track[]> {
  const seed = CHRISTIAN_ARTIST_SEEDS[seedIndex % CHRISTIAN_ARTIST_SEEDS.length];
  const cycle = Math.floor(seedIndex / CHRISTIAN_ARTIST_SEEDS.length);
  const modifier = FOREVER_SEARCH_MODIFIERS[cycle % FOREVER_SEARCH_MODIFIERS.length];
  const dynamicQuery = modifier ? `${seed.query} ${modifier}` : seed.query;
  const itunesOffset = cycle * 6;

  try {
    const [ytRes, itunesRes] = await Promise.allSettled([
      fetch(`/api/music/search-everywhere?q=${encodeURIComponent(dynamicQuery)}`),
      fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          seed.query
        )}&media=music&entity=song&limit=6&offset=${itunesOffset}`
      ),
    ]);

    const tracks: Track[] = [];

    if (ytRes.status === 'fulfilled' && ytRes.value.ok) {
      const ytData = await ytRes.value.json();
      if (Array.isArray(ytData?.items)) {
        ytData.items.slice(0, 6).forEach((item: any, idx: number) => {
          tracks.push(mapYouTubeRichItemToTrack(item, idx, seed.genre, seed.genreLabel));
        });
      }
    }

    if (itunesRes.status === 'fulfilled' && itunesRes.value.ok) {
      const data = await itunesRes.value.json();
      if (Array.isArray(data?.results)) {
        data.results
          .filter((item: any) => item.trackId && item.trackName && item.artistName)
          .forEach((item: any, idx: number) => {
            tracks.push(
              mapItunesItemToTrack(
                item,
                idx,
                seed.genre,
                seed.genreLabel,
                seed.platform,
                seed.bpmEstimate,
                seed.scripture
              )
            );
          });
      }
    }

    return tracks;
  } catch {
    return [];
  }
}

const CLIENT_EXPLICIT_WORDS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'dick',
  'pussy',
  'cunt',
  'motherfucker',
  'nigga',
  'nigger',
  'whore',
  'slut',
  'porn',
  'sex',
  'weed',
  'blunt',
  'molly',
  'lean',
  'satan',
  'lucifer',
  '666',
  'anti-christ',
  'antichrist',
  'hail satan',
  'pentagram',
];

function isClientProfaneOrSecular(text: string): boolean {
  const lower = text.toLowerCase();
  for (const w of CLIENT_EXPLICIT_WORDS) {
    const regex = new RegExp(`\\b${w}\\b`, 'i');
    if (regex.test(lower)) return true;
  }
  return false;
}

export async function searchChristianCatalogLive(query: string): Promise<Track[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Target Christian music query explicitly
  const searchQ =
    trimmed.toLowerCase().includes('christian') ||
    trimmed.toLowerCase().includes('worship') ||
    trimmed.toLowerCase().includes('gospel') ||
    trimmed.toLowerCase().includes('kamban') ||
    trimmed.toLowerCase().includes('t-strike') ||
    trimmed.toLowerCase().includes('bloodrage') ||
    trimmed.toLowerCase().includes('demon hunter') ||
    trimmed.toLowerCase().includes('skillet') ||
    trimmed.toLowerCase().includes('lecrae') ||
    trimmed.toLowerCase().includes('tobymac')
      ? trimmed
      : `${trimmed} Christian`;

  try {
    const [ytRes, itunesRes] = await Promise.allSettled([
      fetch(`/api/music/search-everywhere?q=${encodeURIComponent(searchQ)}`),
      fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          searchQ
        )}&media=music&entity=song&limit=14`
      ),
    ]);

    const results: Track[] = [];

    if (ytRes.status === 'fulfilled' && ytRes.value.ok) {
      const ytData = await ytRes.value.json();
      if (Array.isArray(ytData?.items)) {
        ytData.items.forEach((item: any, idx: number) => {
          if (!isClientProfaneOrSecular(`${item.title} ${item.artist}`)) {
            results.push(mapYouTubeRichItemToTrack(item, idx));
          }
        });
      }
    }

    if (itunesRes.status === 'fulfilled' && itunesRes.value.ok) {
      const data = await itunesRes.value.json();
      if (Array.isArray(data?.results)) {
        data.results
          .filter(
            (item: any) =>
              item.trackId &&
              item.trackName &&
              item.artistName &&
              !isClientProfaneOrSecular(`${item.trackName} ${item.artistName}`)
          )
          .forEach((item: any, idx: number) => {
            const gType = inferGenreFromText(
              `${item.artistName} ${item.trackName} ${item.primaryGenreName || ''}`
            );
            results.push(
              mapItunesItemToTrack(
                item,
                idx,
                gType,
                item.primaryGenreName || 'Christian Release',
                idx % 2 === 0 ? 'Apple Music' : 'Spotify',
                gType === 'metal-hardcore' || gType === 'rock' || gType === 'hiphop' ? 150 : 124,
                'Psalm 150:6'
              )
            );
          });
      }
    }

    return results;
  } catch {
    return [];
  }
}
