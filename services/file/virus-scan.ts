import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

export interface ScanResult {
  id: string;
  fileId: string;
  filename: string;
  fileSize: number;
  hash: string;
  scanEngine: string;
  infected: boolean;
  threats: string[];
  scanDetails: Record<string, any>;
  scannedAt: string;
  scanDuration: number;
}

export interface ScanOptions {
  scanEngine?: 'clamav' | 'custom' | 'hybrid';
  timeout?: number;
  maxFileSize?: number;
  quarantineInfected?: boolean;
  logDetailed?: boolean;
}

export interface QuarantineInfo {
  id: string;
  originalPath: string;
  quarantinePath: string;
  infected: boolean;
  threats: string[];
  quarantinedAt: string;
  restoredAt?: string;
  restoredBy?: string;
}

export class VirusScanner {
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly ALLOWED_EXTENSIONS = [
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf',
    // Images
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico',
    // Archives
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
    // Media
    '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv',
    // Other
    '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts'
  ];
  private readonly DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.sh', '.bin', '.dll', '.sys', '.vbs', '.js', '.jar'
  ];
  private readonly CLOUD_SCAN_API = 'https://www.virustotal.com/api/v3';
  private readonly CLOUD_SCAN_API_KEY = process.env.VIRUSTOTAL_API_KEY;

  async scanFile(
    filePath: string,
    options: ScanOptions = {},
    bucket: string = 'scanned-files'
  ): Promise<ScanResult> {
    const startTime = Date.now();
    let tempFilePath: string | null = null;

    try {
      // Validate file
      const validation = await this.validateFile(filePath, options);
      if (!validation.valid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Read file
      const fileBuffer = await fs.readFile(filePath);
      const fileSize = fileBuffer.length;
      const filename = path.basename(filePath);
      const fileHash = createHash('sha256').update(fileBuffer).digest('hex');

      // Check if already scanned recently
      const existingScan = await this.checkRecentScan(fileHash, options.scanEngine);
      if (existingScan) {
        return existingScan;
      }

      // Choose scan engine
      const scanEngine = options.scanEngine || (this.CLOUD_SCAN_API_KEY ? 'hybrid' : 'clamav');
      
      let scanResult: Omit<ScanResult, 'id' | 'fileId' | 'scannedAt' | 'scanDuration'>;
      
      switch (scanEngine) {
        case 'clamav':
          scanResult = await this.scanWithClamAV(filePath, options);
          break;
        case 'custom':
          scanResult = await this.scanWithCustomEngine(fileBuffer, options);
          break;
        case 'hybrid':
          scanResult = await this.scanWithHybridEngine(fileBuffer, filePath, options);
          break;
        default:
          throw new Error(`Unsupported scan engine: ${scanEngine}`);
      }

      const scanDuration = Date.now() - startTime;

      // Quarantine if infected
      let quarantineInfo: QuarantineInfo | null = null;
      if (scanResult.infected && options.quarantineInfected !== false) {
        quarantineInfo = await this.quarantineFile(filePath, scanResult.threats, bucket);
      }

      // Create scan result
      const result: ScanResult = {
        id: uuidv4(),
        fileId: uuidv4(),
        filename,
        fileSize,
        hash: fileHash,
        scanEngine,
        infected: scanResult.infected,
        threats: scanResult.threats,
        scanDetails: {
          ...scanResult.scanDetails,
          quarantineInfo,
          validation,
        },
        scannedAt: new Date().toISOString(),
        scanDuration,
      };

      // Store scan result
      await this.storeScanResult(result, bucket);

      // Clean uploaded file if infected
      if (scanResult.infected && !options.quarantineInfected) {
        await this.deleteInfectedFile(filePath, bucket);
      }

      return result;
    } catch (error) {
      console.error('Virus scan error:', error);
      throw error;
    } finally {
      // Cleanup temp file if created
      if (tempFilePath) {
        await fs.unlink(tempFilePath).catch(() => {});
      }
    }
  }

  async scanBuffer(
    buffer: Buffer,
    filename: string,
    options: ScanOptions = {},
    bucket: string = 'scanned-files'
  ): Promise<ScanResult> {
    try {
      // Create temp file
      const tempDir = await fs.mkdtemp(path.join('/tmp', 'virus-scan-'));
      const tempFilePath = path.join(tempDir, filename);
      
      await fs.writeFile(tempFilePath, buffer);
      
      // Scan the temp file
      const result = await this.scanFile(tempFilePath, options, bucket);
      
      // Cleanup
      await fs.unlink(tempFilePath).catch(() => {});
      await fs.rmdir(tempDir).catch(() => {});
      
      return result;
    } catch (error) {
      console.error('Buffer scan error:', error);
      throw error;
    }
  }

  async scanDirectory(
    directoryPath: string,
    options: ScanOptions & {
      recursive?: boolean;
      fileExtensions?: string[];
      maxFiles?: number;
    } = {}
  ): Promise<{
    totalScanned: number;
    infected: number;
    clean: number;
    errors: number;
    results: Array<{
      file: string;
      result: ScanResult | null;
      error?: string;
    }>;
  }> {
    const results = [];
    let totalScanned = 0;
    let infected = 0;
    let clean = 0;
    let errors = 0;

    const scanOptions: Required<typeof options> = {
      recursive: options.recursive || false,
      fileExtensions: options.fileExtensions || this.ALLOWED_EXTENSIONS,
      maxFiles: options.maxFiles || 1000,
      scanEngine: options.scanEngine,
      timeout: options.timeout,
      maxFileSize: options.maxFileSize,
      quarantineInfected: options.quarantineInfected,
      logDetailed: options.logDetailed,
    };

    const processDirectory = async (dir: string) => {
      if (totalScanned >= scanOptions.maxFiles) {
        return;
      }

      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (totalScanned >= scanOptions.maxFiles) {
          break;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && scanOptions.recursive) {
          await processDirectory(fullPath);
          continue;
        }

        if (entry.isFile()) {
          // Check file extension
          const ext = path.extname(entry.name).toLowerCase();
          if (!scanOptions.fileExtensions.includes(ext)) {
            continue;
          }

          totalScanned++;

          try {
            const result = await this.scanFile(fullPath, {
              scanEngine: scanOptions.scanEngine,
              timeout: scanOptions.timeout,
              maxFileSize: scanOptions.maxFileSize,
              quarantineInfected: scanOptions.quarantineInfected,
            });

            if (result.infected) {
              infected++;
            } else {
              clean++;
            }

            results.push({
              file: fullPath,
              result,
              error: undefined,
            });
          } catch (error: any) {
            errors++;
            results.push({
              file: fullPath,
              result: null,
              error: error.message,
            });
          }
        }
      }
    };

    await processDirectory(directoryPath);

    return {
      totalScanned,
      infected,
      clean,
      errors,
      results,
    };
  }

  async quarantineFile(
    filePath: string,
    threats: string[],
    bucket: string = 'quarantine'
  ): Promise<QuarantineInfo> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const filename = path.basename(filePath);
      const quarantineId = uuidv4();
      const quarantineFilename = `${quarantineId}_${filename}`;
      const quarantinePath = `quarantine/${quarantineFilename}`;

      // Upload to quarantine bucket
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(quarantinePath, fileBuffer, {
          contentType: 'application/octet-stream',
          upsert: false,
          cacheControl: 'no-cache',
        });

      if (uploadError) {
        throw new Error(`Failed to quarantine file: ${uploadError.message}`);
      }

      // Create quarantine record
      const quarantineInfo: QuarantineInfo = {
        id: quarantineId,
        originalPath: filePath,
        quarantinePath,
        infected: true,
        threats,
        quarantinedAt: new Date().toISOString(),
      };

      await this.storeQuarantineInfo(quarantineInfo, bucket);

      // Delete original file from storage if it exists there
      await this.deleteInfectedFile(filePath, bucket.replace('-quarantine', ''));

      return quarantineInfo;
    } catch (error) {
      console.error('Quarantine error:', error);
      throw error;
    }
  }

  async restoreFromQuarantine(
    quarantineId: string,
    targetBucket: string = 'restored-files',
    restoredBy?: string
  ): Promise<{ success: boolean; restoredPath?: string; error?: string }> {
    try {
      // Get quarantine info
      const quarantineInfo = await this.getQuarantineInfo(quarantineId);
      if (!quarantineInfo) {
        throw new Error('Quarantine record not found');
      }

      // Download quarantined file
      const { data: fileBuffer, error: downloadError } = await supabase.storage
        .from('quarantine')
        .download(quarantineInfo.quarantinePath);

      if (downloadError || !fileBuffer) {
        throw new Error(`Failed to download quarantined file: ${downloadError?.message}`);
      }

      // Rescan before restoration
      const rescanResult = await this.scanBuffer(
        Buffer.from(await fileBuffer.arrayBuffer()),
        path.basename(quarantineInfo.originalPath),
        { scanEngine: 'hybrid' }
      );

      if (rescanResult.infected) {
        throw new Error('File is still infected, cannot restore');
      }

      // Upload to target bucket
      const originalFilename = path.basename(quarantineInfo.originalPath);
      const restoredFilename = `restored_${Date.now()}_${originalFilename}`;
      const restoredPath = `restored/${restoredFilename}`;

      const { error: uploadError } = await supabase.storage
        .from(targetBucket)
        .upload(restoredPath, fileBuffer, {
          contentType: 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to restore file: ${uploadError.message}`);
      }

      // Update quarantine record
      await this.updateQuarantineInfo(quarantineId, {
        restoredAt: new Date().toISOString(),
        restoredBy: restoredBy || 'system',
      });

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(targetBucket)
        .getPublicUrl(restoredPath);

      return {
        success: true,
        restoredPath: publicUrl,
      };
    } catch (error: any) {
      console.error('Restore error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getScanHistory(
    filters: {
      startDate?: string;
      endDate?: string;
      infected?: boolean;
      scanEngine?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    scans: ScanResult[];
    total: number;
    infectedCount: number;
    cleanCount: number;
  }> {
    try {
      let query = supabase
        .from('virus_scans')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.startDate) {
        query = query.gte('scanned_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('scanned_at', filters.endDate);
      }
      if (filters.infected !== undefined) {
        query = query.eq('infected', filters.infected);
      }
      if (filters.scanEngine) {
        query = query.eq('scan_engine', filters.scanEngine);
      }

      // Apply pagination
      const limit = filters.limit || 100;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Order by scan date
      query = query.order('scanned_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch scan history: ${error.message}`);
      }

      // Count infected vs clean
      const infectedCount = data.filter(scan => scan.infected).length;
      const cleanCount = data.length - infectedCount;

      return {
        scans: data as ScanResult[],
        total: count || 0,
        infectedCount,
        cleanCount,
      };
    } catch (error) {
      console.error('Scan history error:', error);
      return {
        scans: [],
        total: 0,
        infectedCount: 0,
        cleanCount: 0,
      };
    }
  }

  async getThreatStatistics(
    timeRange: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<{
    totalScans: number;
    totalInfected: number;
    infectionRate: number;
    topThreats: Array<{ threat: string; count: number }>;
    scansByEngine: Record<string, number>;
    scansByHour: Array<{ hour: number; scans: number; infected: number }>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const { data, error } = await supabase
        .from('virus_scans')
        .select('*')
        .gte('scanned_at', startDate.toISOString())
        .lte('scanned_at', endDate.toISOString());

      if (error) {
        throw new Error(`Failed to fetch threat statistics: ${error.message}`);
      }

      const totalScans = data.length;
      const infectedScans = data.filter(scan => scan.infected);
      const totalInfected = infectedScans.length;
      const infectionRate = totalScans > 0 ? (totalInfected / totalScans) * 100 : 0;

      // Count top threats
      const threatCounts: Record<string, number> = {};
      infectedScans.forEach(scan => {
        scan.threats?.forEach(threat => {
          threatCounts[threat] = (threatCounts[threat] || 0) + 1;
        });
      });

      const topThreats = Object.entries(threatCounts)
        .map(([threat, count]) => ({ threat, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Count scans by engine
      const scansByEngine: Record<string, number> = {};
      data.forEach(scan => {
        scansByEngine[scan.scan_engine] = (scansByEngine[scan.scan_engine] || 0) + 1;
      });

      // Count scans by hour
      const scansByHour = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        scans: 0,
        infected: 0,
      }));

      data.forEach(scan => {
        const hour = new Date(scan.scanned_at).getHours();
        scansByHour[hour].scans++;
        if (scan.infected) {
          scansByHour[hour].infected++;
        }
      });

      return {
        totalScans,
        totalInfected,
        infectionRate: parseFloat(infectionRate.toFixed(2)),
        topThreats,
        scansByEngine,
        scansByHour,
      };
    } catch (error) {
      console.error('Threat statistics error:', error);
      return {
        totalScans: 0,
        totalInfected: 0,
        infectionRate: 0,
        topThreats: [],
        scansByEngine: {},
        scansByHour: Array.from({ length: 24 }, (_, hour) => ({ hour, scans: 0, infected: 0 })),
      };
    }
  }

  async updateVirusDefinitions(): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
      // Update ClamAV virus definitions
      const { stdout, stderr } = await execAsync('freshclam', {
        timeout: 300000, // 5 minutes
      });

      if (stderr && !stderr.includes('Database updated')) {
        throw new Error(`Virus definition update failed: ${stderr}`);
      }

      // Log update
      await this.logDefinitionUpdate({
        updateTime: new Date().toISOString(),
        output: stdout,
        error: stderr,
      });

      return {
        success: true,
        output: stdout,
      };
    } catch (error: any) {
      console.error('Virus definition update error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getScannerHealth(): Promise<{
    clamav: boolean;
    cloudApi: boolean;
    lastUpdate: string | null;
    definitionAge: number;
    scanQueue: number;
  }> {
    try {
      // Check ClamAV
      let clamavHealthy = false;
      try {
        await execAsync('clamscan --version', { timeout: 10000 });
        clamavHealthy = true;
      } catch {
        clamavHealthy = false;
      }

      // Check cloud API
      let cloudApiHealthy = false;
      if (this.CLOUD_SCAN_API_KEY) {
        try {
          await axios.get(`${this.CLOUD_SCAN_API}/metadata/engines`, {
            headers: { 'x-apikey': this.CLOUD_SCAN_API_KEY },
            timeout: 10000,
          });
          cloudApiHealthy = true;
        } catch {
          cloudApiHealthy = false;
        }
      }

      // Get last update time
      const { data: lastUpdate } = await supabase
        .from('virus_definition_updates')
        .select('update_time')
        .order('update_time', { ascending: false })
        .limit(1)
        .single();

      // Get scan queue size
      const { count: scanQueue } = await supabase
        .from('pending_scans')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Calculate definition age
      const definitionAge = lastUpdate?.update_time
        ? Math.floor((Date.now() - new Date(lastUpdate.update_time).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        clamav: clamavHealthy,
        cloudApi: cloudApiHealthy,
        lastUpdate: lastUpdate?.update_time || null,
        definitionAge,
        scanQueue: scanQueue || 0,
      };
    } catch (error) {
      console.error('Scanner health check error:', error);
      return {
        clamav: false,
        cloudApi: false,
        lastUpdate: null,
        definitionAge: 999,
        scanQueue: 0,
      };
    }
  }

  private async scanWithClamAV(
    filePath: string,
    options: ScanOptions
  ): Promise<Omit<ScanResult, 'id' | 'fileId' | 'scannedAt' | 'scanDuration'>> {
    try {
      const timeout = options.timeout || 30000; // 30 seconds default
      
      const { stdout, stderr } = await execAsync(`clamscan --no-summary "${filePath}"`, {
        timeout,
      });

      // Parse ClamAV output
      const infected = !stdout.includes('OK');
      const threats: string[] = [];
      let scanDetails: Record<string, any> = {};

      if (infected) {
        // Extract threat names from ClamAV output
        const threatMatch = stdout.match(/FOUND\n(.+?): (.+?) FOUND/);
        if (threatMatch) {
          threats.push(threatMatch[2]);
        }
        scanDetails = {
          rawOutput: stdout,
          stderr,
          parsed: true,
        };
      } else {
        scanDetails = {
          rawOutput: stdout,
          stderr,
          parsed: true,
        };
      }

      return {
        filename: path.basename(filePath),
        fileSize: (await fs.stat(filePath)).size,
        hash: createHash('sha256').update(await fs.readFile(filePath)).digest('hex'),
        scanEngine: 'clamav',
        infected,
        threats,
        scanDetails,
      };
    } catch (error: any) {
      // Handle timeout or other errors
      if (error.code === 'ETIMEDOUT' || error.killed) {
        throw new Error('Virus scan timed out');
      }

      // Check if ClamAV is not installed
      if (error.code === 'ENOENT' || stderr.includes('command not found')) {
        throw new Error('ClamAV is not installed or not in PATH');
      }

      console.error('ClamAV scan error:', error);
      throw new Error(`ClamAV scan failed: ${error.message}`);
    }
  }

  private async scanWithCustomEngine(
    buffer: Buffer,
    options: ScanOptions
  ): Promise<Omit<ScanResult, 'id' | 'fileId' | 'scannedAt' | 'scanDuration'>> {
    // Custom heuristic scanning logic
    const threats: string[] = [];
    let infected = false;

    // Check file size
    if (buffer.length > (options.maxFileSize || this.MAX_FILE_SIZE)) {
      threats.push('OversizedFile');
      infected = true;
    }

    // Check for suspicious patterns
    const content = buffer.toString('utf8', 0, 10000); // Check first 10KB
    
    // Check for executable patterns
    if (this.containsExecutablePatterns(buffer)) {
      threats.push('SuspiciousExecutablePattern');
      infected = true;
    }

    // Check for known malicious strings
    const maliciousPatterns = [
      /eval\(.*\)/,
      /document\.write\(.*\)/,
      /<script>.*<\/script>/,
      /powershell.*-enc/,
      /cmd\.exe.*\/c/,
    ];

    maliciousPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        threats.push('MaliciousPattern');
        infected = true;
      }
    });

    // Check file header for anomalies
    if (this.hasSuspiciousHeader(buffer)) {
      threats.push('SuspiciousFileHeader');
      infected = true;
    }

    return {
      filename: 'buffer-scan',
      fileSize: buffer.length,
      hash: createHash('sha256').update(buffer).digest('hex'),
      scanEngine: 'custom',
      infected,
      threats,
      scanDetails: {
        heuristicScan: true,
        patternsChecked: maliciousPatterns.length,
        bufferSize: buffer.length,
      },
    };
  }

  private async scanWithHybridEngine(
    buffer: Buffer,
    filePath: string,
    options: ScanOptions
  ): Promise<Omit<ScanResult, 'id' | 'fileId' | 'scannedAt' | 'scanDuration'>> {
    try {
      // First, try cloud scan if API key is available
      if (this.CLOUD_SCAN_API_KEY) {
        try {
          const cloudResult = await this.scanWithCloudAPI(buffer, options);
          if (cloudResult) {
            return cloudResult;
          }
        } catch (cloudError) {
          console.warn('Cloud scan failed, falling back to ClamAV:', cloudError);
        }
      }

      // Fall back to ClamAV
      return await this.scanWithClamAV(filePath, options);
    } catch (error) {
      // Last resort: custom engine
      return await this.scanWithCustomEngine(buffer, options);
    }
  }

  private async scanWithCloudAPI(
    buffer: Buffer,
    options: ScanOptions
  ): Promise<Omit<ScanResult, 'id' | 'fileId' | 'scannedAt' | 'scanDuration'> | null> {
    if (!this.CLOUD_SCAN_API_KEY) {
      return null;
    }

    try {
      // Upload file for scanning
      const formData = new FormData();
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      formData.append('file', blob, 'scanfile.bin');

      const uploadResponse = await axios.post(
        `${this.CLOUD_SCAN_API}/files`,
        formData,
        {
          headers: {
            'x-apikey': this.CLOUD_SCAN_API_KEY,
            'Content-Type': 'multipart/form-data',
          },
          timeout: options.timeout || 60000,
        }
      );

      const analysisId = uploadResponse.data.data.id;

      // Wait for analysis to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Get analysis results
      const analysisResponse = await axios.get(
        `${this.CLOUD_SCAN_API}/analyses/${analysisId}`,
        {
          headers: { 'x-apikey': this.CLOUD_SCAN_API_KEY },
          timeout: options.timeout || 30000,
        }
      );

      const results = analysisResponse.data.data.attributes.results;
      const threats: string[] = [];
      let infected = false;

      // Check each engine's result
      Object.entries(results).forEach(([engine, result]: [string, any]) => {
        if (result.category === 'malicious' || result.category === 'suspicious') {
          infected = true;
          threats.push(`${engine}: ${result.result}`);
        }
      });

      return {
        filename: 'cloud-scanned',
        fileSize: buffer.length,
        hash: createHash('sha256').update(buffer).digest('hex'),
        scanEngine: 'cloud',
        infected,
        threats,
        scanDetails: {
          cloudAnalysisId: analysisId,
          engineCount: Object.keys(results).length,
          maliciousCount: Object.values(results).filter((r: any) => 
            r.category === 'malicious' || r.category === 'suspicious'
          ).length,
          rawResults: results,
        },
      };
    } catch (error) {
      console.error('Cloud scan error:', error);
      return null;
    }
  }

  private async validateFile(
    filePath: string,
    options: ScanOptions
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const stats = await fs.stat(filePath);

      // Check file size
      const maxSize = options.maxFileSize || this.MAX_FILE_SIZE;
      if (stats.size > maxSize) {
        errors.push(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (this.DANGEROUS_EXTENSIONS.includes(ext)) {
        errors.push(`File extension ${ext} is considered dangerous`);
      }

      // Check if file is empty
      if (stats.size === 0) {
        errors.push('File is empty');
      }

      // Check file permissions (too permissive)
      const mode = stats.mode;
      if ((mode & 0o777) === 0o777) {
        errors.push('File has overly permissive permissions (777)');
      }

    } catch (error: any) {
      errors.push(`Unable to read file: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private containsExecutablePatterns(buffer: Buffer): boolean {
    // Check for PE header (Windows executable)
    if (buffer.length >= 2) {
      const header = buffer.toString('hex', 0, 2);
      if (header === '4d5a') { // MZ header
        return true;
      }
    }

    // Check for ELF header (Linux executable)
    if (buffer.length >= 4) {
      const header = buffer.toString('hex', 0, 4);
      if (header === '7f454c46') { // ELF header
        return true;
      }
    }

    // Check for Mach-O header (macOS executable)
    if (buffer.length >= 4) {
      const header = buffer.readUInt32BE(0);
      if (header === 0xfeedface || header === 0xfeedfacf) {
        return true;
      }
    }

    return false;
  }

  private hasSuspiciousHeader(buffer: Buffer): boolean {
    if (buffer.length < 256) {
      return false;
    }

    // Check for PDF with embedded JavaScript
    if (buffer.toString('utf8', 0, 5) === '%PDF-') {
      const content = buffer.toString('utf8', 0, 10000);
      return content.includes('/JavaScript') || content.includes('/JS');
    }

    // Check for Office documents with macros
    if (buffer.toString('hex', 0, 8) === '504b0304') { // ZIP header (docx, xlsx, etc.)
      const content = buffer.toString('utf8', 0, 10000);
      return content.includes('vbaProject') || content.includes('macros');
    }

    return false;
  }

  private async checkRecentScan(
    fileHash: string,
    scanEngine?: string
  ): Promise<ScanResult | null> {
    try {
      let query = supabase
        .from('virus_scans')
        .select('*')
        .eq('hash', fileHash)
        .gte('scanned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('scanned_at', { ascending: false })
        .limit(1);

      if (scanEngine) {
        query = query.eq('scan_engine', scanEngine);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return null;
      }

      return data[0] as ScanResult;
    } catch (error) {
      return null;
    }
  }

  private async storeScanResult(
    result: ScanResult,
    bucket: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('virus_scans')
        .insert({
          id: result.id,
          file_id: result.fileId,
          filename: result.filename,
          file_size: result.fileSize,
          hash: result.hash,
          scan_engine: result.scanEngine,
          infected: result.infected,
          threats: result.threats,
          scan_details: result.scanDetails,
          scanned_at: result.scannedAt,
          scan_duration: result.scanDuration,
          bucket,
        });

      if (error) {
        throw new Error(`Failed to store scan result: ${error.message}`);
      }
    } catch (error) {
      console.error('Scan result storage error:', error);
      throw error;
    }
  }

  private async storeQuarantineInfo(
    info: QuarantineInfo,
    bucket: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('quarantine_records')
        .insert({
          id: info.id,
          original_path: info.originalPath,
          quarantine_path: info.quarantinePath,
          infected: info.infected,
          threats: info.threats,
          quarantined_at: info.quarantinedAt,
          restored_at: info.restoredAt,
          restored_by: info.restoredBy,
          bucket,
        });

      if (error) {
        throw new Error(`Failed to store quarantine info: ${error.message}`);
      }
    } catch (error) {
      console.error('Quarantine info storage error:', error);
      throw error;
    }
  }

  private async getQuarantineInfo(quarantineId: string): Promise<QuarantineInfo | null> {
    try {
      const { data, error } = await supabase
        .from('quarantine_records')
        .select('*')
        .eq('id', quarantineId)
        .single();

      if (error) {
        return null;
      }

      return data as QuarantineInfo;
    } catch (error) {
      return null;
    }
  }

  private async updateQuarantineInfo(
    quarantineId: string,
    updates: Partial<QuarantineInfo>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('quarantine_records')
        .update(updates)
        .eq('id', quarantineId);

      if (error) {
        throw new Error(`Failed to update quarantine info: ${error.message}`);
      }
    } catch (error) {
      console.error('Quarantine info update error:', error);
      throw error;
    }
  }

  private async deleteInfectedFile(filePath: string, bucket: string): Promise<void> {
    try {
      // Extract file path from URL or path
      const fileName = path.basename(filePath);
      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName]);

      if (error) {
        console.warn(`Failed to delete infected file: ${error.message}`);
      }
    } catch (error) {
      console.warn('Error deleting infected file:', error);
    }
  }

  private async logDefinitionUpdate(update: {
    updateTime: string;
    output: string;
    error?: string;
  }): Promise<void> {
    try {
      await supabase
        .from('virus_definition_updates')
        .insert({
          update_time: update.updateTime,
          output: update.output,
          error: update.error,
        });
    } catch (error) {
      console.error('Failed to log definition update:', error);
    }
  }
}

// Singleton instance
let virusScannerInstance: VirusScanner | null = null;

export function getVirusScanner(): VirusScanner {
  if (!virusScannerInstance) {
    virusScannerInstance = new VirusScanner();
  }
  return virusScannerInstance;
}

// Initialize ClamAV on startup
async function initializeVirusScanner() {
  const scanner = getVirusScanner();
  
  // Check scanner health
  const health = await scanner.getScannerHealth();
  
  if (!health.clamav) {
    console.warn('ClamAV is not available. Virus scanning will use fallback methods.');
  }
  
  if (health.definitionAge > 7) {
    console.warn('Virus definitions are outdated. Consider updating.');
  }
}

// Run initialization
initializeVirusScanner().catch(console.error);
