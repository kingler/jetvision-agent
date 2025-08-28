interface ApolloSearchParams {
  job_titles?: string[];
  industries?: string[];
  company_sizes?: string[];
  locations?: string[];
  limit?: number;
}

interface ApolloResponse {
  people?: any[];
  pagination?: {
    page: number;
    per_page: number;
    total_entries: number;
  };
  error?: string;
  details?: string;
}

export class ApolloAPIClient {
  private readonly baseUrl = "https://api.apollo.io/v1";
  private readonly userAgent = "jetvision-apollo-mcp/1.0";
  private apiKey: string;
  private requestQueue: Promise<any>[] = [];
  private readonly maxConcurrentRequests = 10;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchPeople(params: ApolloSearchParams): Promise<ApolloResponse> {
    // Validate parameters
    if (!params.job_titles && !params.industries && !params.company_sizes && !params.locations) {
      throw new Error("At least one search parameter is required");
    }

    // Check concurrent request limit
    if (this.requestQueue.length >= this.maxConcurrentRequests) {
      await Promise.race(this.requestQueue);
    }

    const requestPromise = this.makeRequest("/people/search", "POST", params);
    this.requestQueue.push(requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      const index = this.requestQueue.indexOf(requestPromise);
      if (index > -1) {
        this.requestQueue.splice(index, 1);
      }
    }
  }

  async enrichContact(email: string): Promise<any> {
    return this.makeRequest("/people/match", "POST", { email });
  }

  async createSequence(data: any): Promise<any> {
    return this.makeRequest("/emailer_campaigns", "POST", data);
  }

  async getAccountByDomain(domain: string): Promise<any> {
    return this.makeRequest("/accounts/search", "POST", { 
      domain,
      limit: 1 
    });
  }

  async getEngagementMetrics(sequenceId: string, startDate?: string, endDate?: string): Promise<any> {
    const params: any = { campaign_id: sequenceId };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    return this.makeRequest("/emailer_campaigns/stats", "GET", params);
  }

  async searchOrganizations(params: any): Promise<any> {
    return this.makeRequest("/organizations/search", "POST", params);
  }

  async bulkEnrichPeople(contacts: any[]): Promise<any> {
    return this.makeRequest("/people/bulk_match", "POST", { 
      people: contacts 
    });
  }

  async bulkEnrichOrganizations(organizations: any[]): Promise<any> {
    return this.makeRequest("/organizations/bulk_match", "POST", { 
      organizations 
    });
  }

  async createContact(contactData: any): Promise<any> {
    return this.makeRequest("/contacts", "POST", contactData);
  }

  async updateContact(contactId: string, updates: any): Promise<any> {
    return this.makeRequest(`/contacts/${contactId}`, "PUT", updates);
  }

  async searchContacts(params: any): Promise<any> {
    return this.makeRequest("/contacts/search", "POST", params);
  }

  async searchNews(params: any): Promise<any> {
    return this.makeRequest("/news/search", "POST", params);
  }

  async searchJobPostings(organizationId: string, params?: any): Promise<any> {
    return this.makeRequest(`/organizations/${organizationId}/job_postings`, "GET", params);
  }

  async createDeal(dealData: any): Promise<any> {
    return this.makeRequest("/deals", "POST", dealData);
  }

  async updateDeal(dealId: string, updates: any): Promise<any> {
    return this.makeRequest(`/deals/${dealId}`, "PUT", updates);
  }

  async searchDeals(params: any): Promise<any> {
    return this.makeRequest("/deals/search", "POST", params);
  }

  async createTask(taskData: any): Promise<any> {
    return this.makeRequest("/tasks", "POST", taskData);
  }

  async logCall(callData: any): Promise<any> {
    return this.makeRequest("/calls", "POST", callData);
  }

  async getApiUsage(params?: any): Promise<any> {
    return this.makeRequest("/usage_reports", "GET", params);
  }

  private async makeRequest(endpoint: string, method: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "X-Api-Key": this.apiKey,
      "Content-Type": "application/json",
      "User-Agent": this.userAgent
    };

    const options: RequestInit = {
      method,
      headers,
      body: method !== "GET" && data ? JSON.stringify(data) : undefined
    };

    // Add query params for GET requests
    let finalUrl = url;
    if (method === "GET" && data) {
      const params = new URLSearchParams(data);
      finalUrl = `${url}?${params}`;
    }

    try {
      const response = await fetch(finalUrl, options);

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.makeRequest(endpoint, method, data);
      }

      if (response.status === 401) {
        throw new Error("Authentication failed: Invalid API key");
      }

      const responseData = await response.json() as any;

      if (!response.ok) {
        const errorMessage = responseData?.details || responseData?.error || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      // Validate response format
      if (endpoint.includes("/people/search") && !responseData?.people) {
        throw new Error("Invalid response format: missing 'people' field");
      }

      return responseData;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Network error occurred");
    }
  }
}