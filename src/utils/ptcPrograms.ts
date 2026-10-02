export interface CourseGroup {
  category: string;
  courses: string[];
}

export const PTC_COURSE_GROUPS: CourseGroup[] = [
  {
    category: 'Four-Year Degree Programs',
    courses: [
      'Bachelor of Science in Information Technology (BSIT)',
      'Bachelor of Science in Office Administration (BSOA)',
      'Bachelor of Science in Accounting Information Systems (BSAIS)'
    ]
  },
  {
    category: 'Two-Year Certificate and Associate Programs',
    courses: [
      'Certificate in Computer Science (CCS) / Computer Programming',
      'Certificate in Office Administration (COA)',
      'Certificate in Hotel and Restaurant Management (CHRM)',
      'Associate in Hotel and Restaurant Technology/Services (AHRT/AHRS)',
      'Associate in Accounting Information Systems (AAIS)'
    ]
  }
];

export const PTC_COURSES: string[] = [
  // Four-Year Degree Programs
  'Bachelor of Science in Information Technology (BSIT)',
  'Bachelor of Science in Office Administration (BSOA)',
  'Bachelor of Science in Accounting Information Systems (BSAIS)',
  // Two-Year Certificate and Associate Programs
  'Certificate in Computer Science (CCS) / Computer Programming',
  'Certificate in Office Administration (COA)',
  'Certificate in Hotel and Restaurant Management (CHRM)',
  'Associate in Hotel and Restaurant Technology/Services (AHRT/AHRS)',
  'Associate in Accounting Information Systems (AAIS)',
  'Other Academic Program'
];

export const PTC_YEAR_LEVELS: string[] = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year'
];
