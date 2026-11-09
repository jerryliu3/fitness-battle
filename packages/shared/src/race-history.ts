export type RaceEditionTrend={edition_id:number;event_name:string;edition_year:number;total:number;fastest_ms:number;median_ms:number;chip_count:number;official_count:number};

export type RaceAthleteHistory={id:number;name:string;total:number;page:number;pageSize:number;
  rows:{id:number;athlete_name:string;distance_slug:string;rank_clock:"chip"|"gun";rank_time_ms:number;result_date:string|null;event_name:string;edition_year:number}[];
  bests:{distance_slug:string;rank_clock:"chip"|"gun";time_ms:number;total:number}[];
};
