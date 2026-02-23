'use client';

import { useState } from 'react';
import { MapPin, Briefcase, Clock, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/product/EmptyState';

interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  postedAt: string;
}

export function JobOpenings() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');

  // In production, this would come from API
  const jobOpenings: JobOpening[] = [
    // This would be populated from API
  ];

  const departments = [
    'Engineering',
    'Design',
    'Marketing',
    'Operations',
    'Customer Support',
    'Finance',
    'Human Resources',
  ];

  const locations = [
    'Nairobi, Kenya',
    'Remote',
    'Hybrid',
  ];

  const filteredJobs = jobOpenings.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase()) ||
                         job.department.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment = !department || job.department === department;
    const matchesLocation = !location || job.location === location;
    
    return matchesSearch && matchesDepartment && matchesLocation;
  });

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Open Positions
        </h2>
        <p className="text-gray-600">
          Find the perfect role for your skills and interests
        </p>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div>
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <Select
            value={department}
            onValueChange={setDepartment}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </Select>
        </div>
        <div>
          <Select
            value={location}
            onValueChange={setLocation}
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Job Listings */}
      {filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="border border-gray-200 rounded-lg p-6 hover:border-red-300 hover:shadow-sm transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{job.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      <span>{job.department}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{job.type.replace('-', ' ')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{job.postedAt}</span>
                  <Button variant="secondary" size="sm" href={`/careers/${job.id}`}>
                    View Details
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Open Positions"
          description="Check back soon for new opportunities or submit your resume for future openings."
          icon="search"
          action={{
            label: 'Submit Resume',
            href: '/careers/apply',
          }}
        />
      )}
    </section>
  );
}
