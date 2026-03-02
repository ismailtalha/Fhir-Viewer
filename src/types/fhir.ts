// FHIR R4 Type Definitions

export interface FHIRBundle<T = FHIRResource> {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  link?: Array<{ relation: string; url: string }>;
  entry?: Array<{
    fullUrl?: string;
    resource: T;
  }>;
}

export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
}

export interface FHIRCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FHIRCodeableConcept {
  coding?: FHIRCoding[];
  text?: string;
}

export interface FHIRIdentifier {
  use?: string;
  type?: FHIRCodeableConcept;
  system?: string;
  value?: string;
}

export interface FHIRContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: { start?: string; end?: string };
}

export interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: FHIRIdentifier[];
  active?: boolean;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
    text?: string;
  }>;
  telecom?: FHIRContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: Array<{
    use?: string;
    type?: string;
    text?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  contact?: Array<{
    relationship?: Array<{
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
      text?: string;
    }>;
    name?: {
      use?: string;
      family?: string;
      given?: string[];
      text?: string;
    };
    telecom?: Array<{
      system?: string;
      value?: string;
      use?: string;
    }>;
    gender?: string;
    organization?: { reference?: string };
    period?: { start?: string; end?: string };
  }>;
  generalPractitioner?: Array<{ reference?: string, display?: string }>;
}

export interface FHIRPatientContact {
  relationship?: FHIRCodeableConcept[];
  name?: {
    use?: string;
    family?: string;
    given?: string[];
    text?: string;
  };
  telecom?: FHIRContactPoint[];
  gender?: string;
  organization?: { reference?: string };
  period?: { start?: string; end?: string };
}

export interface FHIRObservation extends FHIRResource {
  resourceType: 'Observation';
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  code: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject?: {
    reference?: string;
    display?: string;
  };
  effectiveDateTime?: string;
  effectivePeriod?: {
    start?: string;
    end?: string;
  };
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  component?: Array<{
    code: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
      text?: string;
    };
    valueQuantity?: {
      value?: number;
      unit?: string;
      system?: string;
      code?: string;
    };
  }>;
  valueCodeableConcept?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
}

export interface FHIRCondition extends FHIRResource {
  resourceType: 'Condition';
  clinicalStatus?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
  verificationStatus?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  severity?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  code?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject?: {
    reference?: string;
    display?: string;
  };
  onsetDateTime?: string;
  onsetAge?: {
    value?: number;
    unit?: string;
  };
  recordedDate?: string;
}

export interface FHIREncounter extends FHIRResource {
  resourceType: 'Encounter';
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled';
  class?: {
    code?: string;
    display?: string;
  };
  type?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
  subject?: {
    reference?: string;
    display?: string;
  };
  period?: {
    start?: string;
    end?: string;
  };
  reasonCode?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
  location?: Array<{
    location: { reference: string; display?: string };
    status?: 'active' | 'reserved' | 'completed' | 'planned';
    period?: { start?: string; end?: string };
  }>;
}

export interface FHIRLocation extends FHIRResource {
  resourceType: 'Location';
  status?: 'active' | 'suspended' | 'inactive';
  name?: string;
  alias?: string[];
  description?: string;
  mode?: 'instance' | 'kind';
  type?: FHIRCodeableConcept[];
  telecom?: FHIRContactPoint[];
  address?: {
    text?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  physicalType?: FHIRCodeableConcept;
  position?: {
    longitude: number;
    latitude: number;
    altitude?: number;
  };
  managingOrganization?: { reference: string };
  partOf?: { reference: string };
}

export interface FHIRProcedure extends FHIRResource {
  resourceType: 'Procedure';
  status: 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed' | 'entered-in-error' | 'unknown';
  code?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  performedDateTime?: string;
  performedPeriod?: {
    start?: string;
    end?: string;
  };
}

export interface FHIRAttachment {
  contentType?: string;
  language?: string;
  data?: string;
  url?: string;
  size?: number;
  hash?: string;
  title?: string;
  creation?: string;
}

export interface FHIRDocumentReference extends FHIRResource {
  resourceType: 'DocumentReference';
  status: 'current' | 'superseded' | 'entered-in-error';
  type?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject?: {
    reference?: string;
  };
  date?: string;
  content: Array<{
    attachment: FHIRAttachment;
    format?: {
      system?: string;
      code?: string;
      display?: string;
    };
  }>;
}

export interface FHIRDiagnosticReport extends FHIRResource {
  resourceType: 'DiagnosticReport';
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  code: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject?: {
    reference?: string;
  };
  effectiveDateTime?: string;
  issued?: string;
  result?: Array<{
    reference?: string;
    display?: string;
  }>;
  presentedForm?: Array<FHIRAttachment>;
}

// Simplified types for UI
export interface SimplePatient {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
  phone?: string;
  address?: string;
  deceased?: boolean;
  mrn?: string;
  identifiers: Array<{ type: string; value: string; system?: string }>;
  telecoms: Array<{ system: string; value: string; use: string }>;
  primaryDoctor?: string;
  contacts: Array<{ name: string; relationship: string; phone?: string }>;
  codeStatus?: string;
  admissionDiagnosis?: string;
  location?: string;
  locationId?: string;
}

export interface SimpleVital {
  id: string;
  code: string;
  display: string;
  value: string;
  unit: string;
  effectiveDateTime: string;
  category: 'vital-signs' | 'laboratory' | 'other';
}

export interface SimpleCondition {
  id: string;
  code: string;
  display: string;
  clinicalStatus: string;
  severity?: string;
  onsetDateTime?: string;
}

export interface SimpleEncounter {
  id: string;
  type: string;
  reason: string;
  period: string;
  start?: string;
  end?: string;
  status: string;
  location?: {
    id: string;
    name: string;
  };
}

export interface SimpleProcedure {
  id: string;
  code: string;
  display: string;
  status: string;
  performedDateTime?: string;
}

export interface SimpleDocument {
  id: string;
  title: string;
  type: string;
  date: string;
  contentType: string;
  url?: string;
  data?: string;
  size?: number;
  category: 'document' | 'report';
}

export interface PaginatedList<T> {
  resources: T[];
  nextOffset?: string;
  total?: number;
}

export interface PatientDashboard {
  patient: SimplePatient;
  vitals: PaginatedList<SimpleVital>;
  labResults: PaginatedList<SimpleVital>;
  conditions: PaginatedList<SimpleCondition>;
  encounters: PaginatedList<SimpleEncounter>;
  procedures: PaginatedList<SimpleProcedure>;
  observations: PaginatedList<SimpleVital>;
  documents: PaginatedList<SimpleDocument>;
}

export interface TimelineEvent {
  id: string;
  type: 'encounter' | 'observation' | 'procedure' | 'condition' | 'document';
  title: string;
  description: string;
  timestamp: string;
  endTimestamp?: string;
  status?: string;
  value?: string;
  unit?: string;
  category?: string;
  basedOn?: string[];
  raw?: any;
}

// Connection types
export interface FHIRConnection {
  baseUrl: string;
  authType: 'none' | 'bearer' | 'basic';
  token?: string;
  username?: string;
  password?: string;
}

// API Response types
export interface ConnectResponse {
  success: boolean;
  error?: string;
  serverName?: string;
  fhirVersion?: string;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AgentAction[];
}

export interface AgentAction {
  type: 'create' | 'read' | 'update' | 'delete';
  resourceType: string;
  resourceId?: string;
  success: boolean;
}
