import {
    FHIRBundle,
    FHIRPatient,
    FHIRObservation,
    FHIRCondition,
    FHIREncounter,
    FHIRProcedure,
    SimplePatient,
    SimpleVital,
    SimpleCondition,
    SimpleEncounter,
    SimpleProcedure,
    PatientDashboard,
    FHIRConnection,
    FHIRDocumentReference,
    FHIRDiagnosticReport,
    SimpleDocument,
    PaginatedList,
    FHIRResource,
    FHIRIdentifier,
    FHIRCoding,
    FHIRContactPoint,
    FHIRPatientContact,
    FHIRLocation
} from '@/types/fhir';

export class FHIRClient {
    private baseUrl: string;
    private headers: HeadersInit;

    constructor(connection: FHIRConnection) {
        this.baseUrl = connection.baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.headers = this.buildHeaders(connection);
    }

    private buildHeaders(connection: FHIRConnection): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/fhir+json',
            'Accept': 'application/fhir+json',
        };

        if (connection.authType === 'bearer' && connection.token) {
            headers['Authorization'] = `Bearer ${connection.token}`;
        } else if (connection.authType === 'basic' && connection.username && connection.password) {
            const credentials = Buffer.from(`${connection.username}:${connection.password}`).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
        }

        return headers;
    }

    public async request<T>(path: string, options?: RequestInit): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
            ...options,
            headers: { ...this.headers, ...options?.headers },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`FHIR request failed: ${response.status} - ${error}`);
        }

        return response.json();
    }

    // Test connection by fetching metadata
    async testConnection(): Promise<{ success: boolean; serverName?: string; fhirVersion?: string }> {
        try {
            const metadata = await this.request<{
                resourceType: string;
                fhirVersion?: string;
                software?: { name?: string };
                implementation?: { description?: string };
            }>('/metadata');

            return {
                success: metadata.resourceType === 'CapabilityStatement',
                serverName: metadata.implementation?.description || metadata.software?.name || 'FHIR Server',
                fhirVersion: metadata.fhirVersion,
            };
        } catch {
            return { success: false };
        }
    }

    // Patient operations
    async getPatients(searchParams?: { name?: string; _count?: number; _getpagesoffset?: string }): Promise<{ patients: SimplePatient[]; nextOffset?: string }> {
        const params = new URLSearchParams();
        if (searchParams?.name) params.append('name', searchParams.name);
        params.append('_count', (searchParams?._count || 20).toString());
        if (searchParams?._getpagesoffset) params.append('_getpagesoffset', searchParams._getpagesoffset);

        const queryString = params.toString() ? `?${params.toString()}` : '';
        const bundle = await this.request<FHIRBundle<FHIRPatient>>(`/Patient${queryString}`);

        // Extract next link for pagination
        const nextLink = bundle.link?.find(l => l.relation === 'next')?.url;
        let nextOffset: string | undefined;

        if (nextLink) {
            try {
                const url = new URL(nextLink);
                nextOffset = url.searchParams.get('_getpagesoffset') || undefined;
            } catch {
                // If full URL parsing fails (might be relative), try regex or just manual check
                const match = nextLink.match(/_getpagesoffset=([^&]+)/);
                if (match) nextOffset = match[1];
            }
        }

        return {
            patients: (bundle.entry || []).map(entry => this.simplifyPatient(entry.resource)),
            nextOffset
        };
    }

    async getPatient(id: string): Promise<SimplePatient> {
        const patient = await this.request<FHIRPatient>(`/Patient/${id}`);
        return this.simplifyPatient(patient);
    }

    async createPatient(patient: Partial<FHIRPatient>): Promise<FHIRPatient> {
        return this.request<FHIRPatient>('/Patient', {
            method: 'POST',
            body: JSON.stringify({ ...patient, resourceType: 'Patient' }),
        });
    }

    // Helper for pagination extraction
    private extractNextOffset(bundle: FHIRBundle<any>): string | undefined {
        const nextLink = bundle.link?.find(l => l.relation === 'next')?.url;
        if (!nextLink) return undefined;

        try {
            const url = new URL(nextLink);
            return url.searchParams.get('_getpagesoffset') || undefined;
        } catch {
            const match = nextLink.match(/_getpagesoffset=([^&]+)/);
            return match ? match[1] : undefined;
        }
    }

    // Observation operations
    async getObservations(patientId: string, category?: string, offset?: string): Promise<{ resources: SimpleVital[]; nextOffset?: string; total?: number }> {
        const params = new URLSearchParams();
        params.append('subject', `Patient/${patientId}`);
        params.append('_sort', '-date');
        params.append('_count', '50');
        if (category) params.append('category', category);
        if (offset) params.append('_getpagesoffset', offset);

        const bundle = await this.request<FHIRBundle<FHIRObservation>>(`/Observation?${params.toString()}`);
        return {
            resources: (bundle.entry || []).map(entry => this.simplifyObservation(entry.resource)),
            nextOffset: this.extractNextOffset(bundle),
            total: bundle.total
        };
    }

    async createObservation(observation: Partial<FHIRObservation>): Promise<FHIRObservation> {
        return this.request<FHIRObservation>('/Observation', {
            method: 'POST',
            body: JSON.stringify({ ...observation, resourceType: 'Observation' }),
        });
    }

    async updateObservation(id: string, observation: Partial<FHIRObservation>): Promise<FHIRObservation> {
        return this.request<FHIRObservation>(`/Observation/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...observation, resourceType: 'Observation', id }),
        });
    }

    async deleteObservation(id: string): Promise<void> {
        await this.request(`/Observation/${id}`, { method: 'DELETE' });
    }

    // Condition operations
    async getConditions(patientId: string, offset?: string): Promise<{ resources: SimpleCondition[]; nextOffset?: string; total?: number }> {
        const cleanId = patientId.replace(/^Patient\//, '');
        const params = new URLSearchParams();
        // Use 'patient' instead of 'subject' for better compatibility
        params.append('patient', cleanId);
        params.append('_count', '50');
        if (offset) params.append('_getpagesoffset', offset);

        const url = `/Condition?${params.toString()}`;
        const bundle = await this.request<FHIRBundle<FHIRCondition>>(url);

        return {
            resources: (bundle.entry || []).map(entry => this.simplifyCondition(entry.resource)),
            nextOffset: this.extractNextOffset(bundle),
            total: bundle.total
        };
    }

    async createCondition(condition: Partial<FHIRCondition>): Promise<FHIRCondition> {
        return this.request<FHIRCondition>('/Condition', {
            method: 'POST',
            body: JSON.stringify({ ...condition, resourceType: 'Condition' }),
        });
    }

    // Encounter operations
    async getEncounters(patientId: string, offset?: string): Promise<{ resources: SimpleEncounter[]; nextOffset?: string; total?: number }> {
        const params = new URLSearchParams();
        params.append('subject', `Patient/${patientId}`);
        params.append('_sort', '-date');
        params.append('_count', '50');
        if (offset) params.append('_getpagesoffset', offset);

        const bundle = await this.request<FHIRBundle<FHIREncounter>>(`/Encounter?${params.toString()}`);
        return {
            resources: (bundle.entry || []).map(entry => this.simplifyEncounter(entry.resource)),
            nextOffset: this.extractNextOffset(bundle),
            total: bundle.total
        };
    }

    async getAdmissionDiagnosis(patientId: string): Promise<string | undefined> {
        const cleanId = patientId.replace(/^Patient\//, '');
        // Usually admission diagnosis is a Condition with category 'encounter-diagnosis' 
        // or a reason in the latest Encounter. We'll check both.
        try {
            const encounters = await this.request<FHIRBundle<FHIREncounter>>(`/Encounter?patient=${cleanId}&_sort=-date&_count=1`);
            const latestEncounter = encounters.entry?.[0]?.resource;
            if (latestEncounter?.reasonCode?.[0]?.text || latestEncounter?.reasonCode?.[0]?.coding?.[0]?.display) {
                return latestEncounter.reasonCode[0].text || latestEncounter.reasonCode[0].coding?.[0]?.display;
            }

            const conditions = await this.request<FHIRBundle<FHIRCondition>>(`/Condition?patient=${cleanId}&category=encounter-diagnosis&_count=1`);
            const diag = conditions.entry?.[0]?.resource;
            return diag?.code?.text || diag?.code?.coding?.[0]?.display;
        } catch {
            return undefined;
        }
    }

    async getCodeStatus(patientId: string): Promise<string | undefined> {
        const cleanId = patientId.replace(/^Patient\//, '');
        // Code status is often stored as an Observation with LOINC 75310-3
        try {
            const bundle = await this.request<FHIRBundle<FHIRObservation>>(`/Observation?patient=${cleanId}&code=75310-3&_sort=-date&_count=1`);
            const obs = bundle.entry?.[0]?.resource;
            return obs?.valueCodeableConcept?.text || obs?.valueString || obs?.code?.text;
        } catch {
            return undefined;
        }
    }

    async createEncounter(encounter: Partial<FHIREncounter>): Promise<FHIREncounter> {
        return this.request<FHIREncounter>('/Encounter', {
            method: 'POST',
            body: JSON.stringify({ ...encounter, resourceType: 'Encounter' }),
        });
    }

    async getLocations(): Promise<FHIRLocation[]> {
        const bundle = await this.request<FHIRBundle<FHIRLocation>>('/Location?_count=100');
        return (bundle.entry || []).map(entry => entry.resource);
    }

    async getCurrentLocation(patientId: string): Promise<{ id: string, name: string } | undefined> {
        const cleanId = patientId.replace(/^Patient\//, '');
        const bundle = await this.request<FHIRBundle<FHIREncounter>>(`/Encounter?patient=${cleanId}&status=in-progress&_sort=-date&_count=1`);
        const latest = bundle.entry?.[0]?.resource;
        if (!latest) return undefined;

        const activeLoc = latest.location?.find(l => l.status === 'active');
        if (activeLoc) {
            return {
                id: activeLoc.location.reference.replace(/^Location\//, ''),
                name: activeLoc.location.display || 'Unknown Location'
            };
        }
        return undefined;
    }

    async updatePatientLocation(patientId: string, locationId: string, locationName: string): Promise<FHIREncounter> {
        const cleanId = patientId.replace(/^Patient\//, '');
        // 1. Find current active encounter
        const bundle = await this.request<FHIRBundle<FHIREncounter>>(`/Encounter?patient=${cleanId}&status=in-progress&_sort=-date&_count=1`);
        let encounter = bundle.entry?.[0]?.resource;

        const now = new Date().toISOString();

        if (encounter) {
            // 2. Update existing encounter
            const locations = encounter.location || [];
            // Mark previous active locations as completed
            locations.forEach(l => {
                if (l.status === 'active') {
                    l.status = 'completed';
                    if (!l.period) l.period = {};
                    l.period.end = now;
                }
            });
            // Add new active location
            locations.push({
                location: { reference: `Location/${locationId}`, display: locationName },
                status: 'active',
                period: { start: now }
            });
            encounter.location = locations;

            return this.request<FHIREncounter>(`/Encounter/${encounter.id}`, {
                method: 'PUT',
                body: JSON.stringify(encounter)
            });
        } else {
            // 3. Create new encounter if none active
            return this.createEncounter({
                status: 'in-progress',
                class: { code: 'IMP', display: 'inpatient encounter' },
                subject: { reference: `Patient/${cleanId}` },
                period: { start: now },
                location: [{
                    location: { reference: `Location/${locationId}`, display: locationName },
                    status: 'active',
                    period: { start: now }
                }]
            });
        }
    }

    // Procedure operations
    async getProcedures(patientId: string, offset?: string): Promise<{ resources: SimpleProcedure[]; nextOffset?: string; total?: number }> {
        const params = new URLSearchParams();
        params.append('subject', `Patient/${patientId}`);
        params.append('_sort', '-date');
        params.append('_count', '50');
        if (offset) params.append('_getpagesoffset', offset);

        const bundle = await this.request<FHIRBundle<FHIRProcedure>>(`/Procedure?${params.toString()}`);
        return {
            resources: (bundle.entry || []).map(entry => this.simplifyProcedure(entry.resource)),
            nextOffset: this.extractNextOffset(bundle),
            total: bundle.total
        };
    }

    async createProcedure(procedure: Partial<FHIRProcedure>): Promise<FHIRProcedure> {
        return this.request<FHIRProcedure>('/Procedure', {
            method: 'POST',
            body: JSON.stringify({ ...procedure, resourceType: 'Procedure' }),
        });
    }

    // Document and Report operations
    async getDocuments(patientId: string, offset?: string): Promise<{ resources: SimpleDocument[]; nextOffset?: string; total?: number }> {
        const cleanId = patientId.replace(/^Patient\//, '');

        // Fetch both DocumentReference and DiagnosticReport
        const [docRefBundle, diagReportBundle] = await Promise.all([
            this.request<FHIRBundle<FHIRDocumentReference>>(`/DocumentReference?patient=${cleanId}&_count=20${offset ? `&_getpagesoffset=${offset}` : ''}`),
            this.request<FHIRBundle<FHIRDiagnosticReport>>(`/DiagnosticReport?patient=${cleanId}&_count=20${offset ? `&_getpagesoffset=${offset}` : ''}`)
        ]);

        const documents: SimpleDocument[] = [
            ...(docRefBundle.entry || []).map(entry => this.simplifyDocumentReference(entry.resource)),
            ...(diagReportBundle.entry || []).map(entry => this.simplifyDiagnosticReport(entry.resource))
        ];

        // Sort by date descending
        documents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            resources: documents,
            nextOffset: docRefBundle.link?.find(l => l.relation === 'next') ? this.extractNextOffset(docRefBundle) : undefined,
            total: (docRefBundle.total || 0) + (diagReportBundle.total || 0)
        };
    }

    // Get complete patient dashboard
    async getPatientDashboard(patientId: string): Promise<PatientDashboard> {
        const [patient, vitalsData, labsData, observationsData, conditionsData, encountersData, proceduresData, documentsData, codeStatus, admissionDiagnosis, currentLocation] = await Promise.all([
            this.getPatient(patientId),
            this.getObservations(patientId, 'vital-signs').catch(() => ({ resources: [] })),
            this.getObservations(patientId, 'laboratory').catch(() => ({ resources: [] })),
            this.getObservations(patientId).catch(() => ({ resources: [] })),
            this.getConditions(patientId).catch(() => ({ resources: [] })),
            this.getEncounters(patientId).catch(() => ({ resources: [] })),
            this.getProcedures(patientId).catch(() => ({ resources: [] })),
            this.getDocuments(patientId).catch(() => ({ resources: [] })),
            this.getCodeStatus(patientId).catch(() => undefined),
            this.getAdmissionDiagnosis(patientId).catch(() => undefined),
            this.getCurrentLocation(patientId).catch(() => undefined),
        ]);

        return {
            patient: {
                ...patient,
                codeStatus: codeStatus || 'Full Code',
                admissionDiagnosis: admissionDiagnosis || 'Not specified',
                location: currentLocation?.name,
                locationId: currentLocation?.id
            },
            vitals: vitalsData,
            labResults: labsData,
            observations: observationsData,
            conditions: conditionsData,
            encounters: encountersData,
            procedures: proceduresData,
            documents: documentsData as PaginatedList<SimpleDocument>,
        };
    }

    // Helper methods to simplify FHIR resources
    private simplifyPatient(patient: FHIRPatient): SimplePatient {
        const name = patient.name?.[0];
        const displayName = name?.text ||
            [name?.given?.join(' '), name?.family].filter(Boolean).join(' ') ||
            'Unknown';

        const phone = patient.telecom?.find(t => t.system === 'phone' || t.use === 'home')?.value;
        const address = patient.address?.[0];
        const addressText = address?.text ||
            [address?.line?.join(', '), address?.city, address?.state, address?.postalCode]
                .filter(Boolean).join(', ');

        const mrnIdentifier = (patient.identifier || []).find((id: any) =>
            id.type?.coding?.some((c: any) => c.code === 'MR') ||
            id.system?.toLowerCase().includes('mrn')
        );

        const identifiers = (patient.identifier || []).map((id: any) => ({
            type: id.type?.text || id.type?.coding?.[0]?.display || 'Other',
            value: id.value || '',
            system: id.system
        }));

        const telecoms = (patient.telecom || []).map((t: any) => ({
            system: t.system || 'phone',
            value: t.value || '',
            use: t.use || 'home'
        }));

        const contacts = (patient.contact || []).map((c: any) => ({
            name: c.name?.text || [c.name?.given?.join(' '), c.name?.family].filter(Boolean).join(' ') || 'Unknown',
            relationship: c.relationship?.[0]?.text || c.relationship?.[0]?.coding?.[0]?.display || 'Contact',
            phone: c.telecom?.find((t: any) => t.system === 'phone')?.value
        }));

        // Primary doctor is often in generalPractitioner
        const gp = (patient as any).generalPractitioner?.[0]?.display || (patient as any).generalPractitioner?.[0]?.reference || 'N/A';

        return {
            id: patient.id || '',
            name: displayName,
            birthDate: patient.birthDate || '',
            gender: patient.gender || 'unknown',
            phone,
            address: addressText,
            deceased: patient.deceasedBoolean || !!patient.deceasedDateTime,
            mrn: mrnIdentifier?.value || identifiers[0]?.value || 'N/A',
            identifiers,
            telecoms,
            contacts,
            primaryDoctor: gp
        };
    }

    private simplifyObservation(obs: FHIRObservation): SimpleVital {
        const code = obs.code.coding?.[0];
        let value = '';
        let unit = '';

        if (obs.valueQuantity) {
            value = obs.valueQuantity.value?.toString() || '';
            unit = obs.valueQuantity.unit || '';
        } else if (obs.valueString) {
            value = obs.valueString;
        } else if (obs.component && obs.component.length > 0) {
            // Blood pressure style with components
            value = obs.component
                .map(c => c.valueQuantity?.value?.toString() || '')
                .filter(Boolean)
                .join('/');
            unit = obs.component[0]?.valueQuantity?.unit || 'mmHg';
        }

        const category = obs.category?.[0]?.coding?.[0]?.code as 'vital-signs' | 'laboratory' | 'other' || 'other';

        return {
            id: obs.id || '',
            code: code?.code || '',
            display: code?.display || obs.code.text || 'Unknown',
            value,
            unit,
            effectiveDateTime: obs.effectiveDateTime || '',
            category,
        };
    }

    private simplifyCondition(condition: FHIRCondition): SimpleCondition {
        const code = condition.code?.coding?.[0];
        const status = condition.clinicalStatus?.coding?.[0]?.code || 'unknown';

        return {
            id: condition.id || '',
            code: code?.code || '',
            display: code?.display || condition.code?.text || 'Unknown condition',
            clinicalStatus: status,
            severity: condition.severity?.coding?.[0]?.display || condition.severity?.text,
            onsetDateTime: condition.onsetDateTime,
        };
    }

    private simplifyEncounter(encounter: FHIREncounter): SimpleEncounter {
        const type = encounter.type?.[0]?.coding?.[0]?.display || encounter.type?.[0]?.text || 'Unknown Type';
        const reason = encounter.reasonCode?.[0]?.coding?.[0]?.display || encounter.reasonCode?.[0]?.text || 'No reason';
        const start = encounter.period?.start ? new Date(encounter.period.start).toLocaleDateString() : '';
        const end = encounter.period?.end ? new Date(encounter.period.end).toLocaleDateString() : '';
        const period = start && end ? `${start} - ${end}` : start || end || 'Unknown Date';

        const activeLocation = encounter.location?.find(l => l.status === 'active')?.location;

        return {
            id: encounter.id || '',
            type,
            reason,
            period,
            start: encounter.period?.start,
            end: encounter.period?.end,
            status: encounter.status,
            location: activeLocation ? {
                id: activeLocation.reference.replace(/^Location\//, ''),
                name: activeLocation.display || 'Unknown Location'
            } : undefined
        };
    }

    private simplifyProcedure(proc: FHIRProcedure): SimpleProcedure {
        return {
            id: proc.id || '',
            code: proc.code?.coding?.[0]?.code || '',
            display: proc.code?.text || proc.code?.coding?.[0]?.display || 'Unknown Procedure',
            status: proc.status,
            performedDateTime: proc.performedDateTime || proc.performedPeriod?.start,
        };
    }

    private simplifyDocumentReference(doc: FHIRDocumentReference): SimpleDocument {
        const attachment = doc.content[0]?.attachment;
        return {
            id: doc.id || '',
            title: attachment?.title || doc.type?.text || doc.type?.coding?.[0]?.display || 'Clinical Document',
            type: doc.type?.coding?.[0]?.display || 'Document',
            date: doc.date || doc.meta?.lastUpdated || new Date().toISOString(),
            contentType: attachment?.contentType || 'application/octet-stream',
            url: attachment?.url,
            data: attachment?.data,
            size: attachment?.size,
            category: 'document'
        };
    }

    private simplifyDiagnosticReport(report: FHIRDiagnosticReport): SimpleDocument {
        const attachment = report.presentedForm?.[0];
        return {
            id: report.id || '',
            title: attachment?.title || report.code?.text || report.code?.coding?.[0]?.display || 'Diagnostic Report',
            type: report.code?.coding?.[0]?.display || 'Report',
            date: report.effectiveDateTime || report.issued || report.meta?.lastUpdated || new Date().toISOString(),
            contentType: attachment?.contentType || 'application/octet-stream',
            url: attachment?.url,
            data: attachment?.data,
            size: attachment?.size,
            category: 'report'
        };
    }

    // Build FHIR resources for creation
    static buildBloodPressureObservation(
        patientId: string,
        systolic: number,
        diastolic: number,
        effectiveDateTime?: string
    ): Partial<FHIRObservation> {
        return {
            status: 'final',
            category: [{
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                    code: 'vital-signs',
                    display: 'Vital Signs',
                }],
            }],
            code: {
                coding: [{
                    system: 'http://loinc.org',
                    code: '85354-9',
                    display: 'Blood pressure panel with all children optional',
                }],
                text: 'Blood Pressure',
            },
            subject: { reference: `Patient/${patientId}` },
            effectiveDateTime: effectiveDateTime || new Date().toISOString(),
            component: [
                {
                    code: {
                        coding: [{
                            system: 'http://loinc.org',
                            code: '8480-6',
                            display: 'Systolic blood pressure',
                        }],
                    },
                    valueQuantity: { value: systolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
                },
                {
                    code: {
                        coding: [{
                            system: 'http://loinc.org',
                            code: '8462-4',
                            display: 'Diastolic blood pressure',
                        }],
                    },
                    valueQuantity: { value: diastolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
                },
            ],
        };
    }

    static buildHeartRateObservation(
        patientId: string,
        heartRate: number,
        effectiveDateTime?: string
    ): Partial<FHIRObservation> {
        return {
            status: 'final',
            category: [{
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                    code: 'vital-signs',
                    display: 'Vital Signs',
                }],
            }],
            code: {
                coding: [{
                    system: 'http://loinc.org',
                    code: '8867-4',
                    display: 'Heart rate',
                }],
                text: 'Heart Rate',
            },
            subject: { reference: `Patient/${patientId}` },
            effectiveDateTime: effectiveDateTime || new Date().toISOString(),
            valueQuantity: {
                value: heartRate,
                unit: '/min',
                system: 'http://unitsofmeasure.org',
                code: '/min',
            },
        };
    }

    static buildPatient(
        givenName: string,
        familyName: string,
        gender: 'male' | 'female' | 'other' | 'unknown',
        birthDate: string
    ): Partial<FHIRPatient> {
        return {
            active: true,
            name: [{
                use: 'official',
                family: familyName,
                given: [givenName],
            }],
            gender,
            birthDate,
        };
    }

    // Manipulation
    async updatePatient(id: string, updates: Partial<FHIRPatient>): Promise<FHIRPatient> {
        // Fetch current to avoid overwriting missing fields if server doesn't support PATCH well
        const currentPatient = await this.request<FHIRPatient>(`/Patient/${id}`);

        // Deep merge or specific field merge to avoid clearing other data
        const updatedPatient: FHIRPatient = {
            ...currentPatient,
            ...updates,
            id: id, // Ensure ID is preserved
            resourceType: 'Patient' // Ensure resourceType is preserved
        };

        // If we are updating contact, typically we might want to preserve others or replace primary
        if (updates.contact && currentPatient.contact) {
            // Simple approach: prepend our new contact or replace if it's special
            // For now, we'll replace the first one if we're only sending one
            if (updates.contact.length === 1) {
                const otherContacts = currentPatient.contact.slice(1);
                updatedPatient.contact = [...updates.contact, ...otherContacts];
            } else {
                // If multiple contacts are provided in updates, replace all existing contacts
                updatedPatient.contact = updates.contact;
            }
        } else if (updates.contact) {
            // If currentPatient had no contacts but updates does, just use updates.contact
            updatedPatient.contact = updates.contact;
        }

        // Handle generalPractitioner array merging
        if (updates.generalPractitioner && currentPatient.generalPractitioner) {
            // Simple approach: replace all existing generalPractitioners with the ones from updates
            updatedPatient.generalPractitioner = updates.generalPractitioner;
        } else if (updates.generalPractitioner) {
            // If currentPatient had no generalPractitioner but updates does, just use updates.generalPractitioner
            updatedPatient.generalPractitioner = updates.generalPractitioner;
        }

        // Other arrays (e.g., address, telecom) would need similar explicit merging logic
        // if a simple replacement or shallow merge is not desired.
        // For now, they will be shallow merged by the spread operator.

        return this.request<FHIRPatient>(`/Patient/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedPatient),
        });
    }

    async updateCodeStatus(patientId: string, status: string): Promise<FHIRObservation> {
        const cleanId = patientId.replace(/^Patient\//, '');
        // Create new observation for code status
        const observation: Partial<FHIRObservation> = {
            resourceType: 'Observation',
            status: 'final',
            code: {
                coding: [{
                    system: 'http://loinc.org',
                    code: '75310-3',
                    display: 'Health care goals'
                }],
                text: 'Code Status'
            },
            subject: { reference: `Patient/${cleanId}` },
            effectiveDateTime: new Date().toISOString(),
            valueString: status
        };

        return this.request<FHIRObservation>('/Observation', {
            method: 'POST',
            body: JSON.stringify(observation),
        });
    }

    // Debugging / Full Record
    async getPatientEverything(patientId: string): Promise<Record<string, number>> {
        const cleanId = patientId.replace(/^Patient\//, '');
        // $everything returns all resources related to the patient
        const bundle = await this.request<FHIRBundle<FHIRResource>>(`/Patient/${cleanId}/$everything`);

        // Count resources by type
        const counts: Record<string, number> = {};
        bundle.entry?.forEach(entry => {
            const type = entry.resource.resourceType;
            counts[type] = (counts[type] || 0) + 1;
        });

        console.log(`$everything counts for ${cleanId}:`, counts);
        return counts;
    }
}

// Singleton factory
let clientInstance: FHIRClient | null = null;

export function createFHIRClient(connection: FHIRConnection): FHIRClient {
    clientInstance = new FHIRClient(connection);
    return clientInstance;
}

export function getFHIRClient(): FHIRClient | null {
    return clientInstance;
}
