import Image from 'next/image';

export function TeamSection() {
  const teamMembers = [
    {
      name: 'David Kimani',
      role: 'Founder & CEO',
      bio: 'Former tech executive with 15+ years of e-commerce experience.',
      image: '/team/david.jpg',
    },
    {
      name: 'Sarah Mwangi',
      role: 'Chief Operations Officer',
      bio: 'Logistics and supply chain expert with focus on African markets.',
      image: '/team/sarah.jpg',
    },
    {
      name: 'James Omondi',
      role: 'Chief Technology Officer',
      bio: 'Full-stack developer passionate about scalable architecture.',
      image: '/team/james.jpg',
    },
    {
      name: 'Grace Akinyi',
      role: 'Head of Customer Experience',
      bio: 'Customer service veteran dedicated to exceptional support.',
      image: '/team/grace.jpg',
    },
  ];

  return (
    <section className="mb-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Meet Our Leadership
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          A diverse team of passionate professionals dedicated to transforming e-commerce in Kenya.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {teamMembers.map((member) => (
          <div key={member.name} className="text-center">
            <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center text-3xl">
                {member.name.split(' ').map(n => n[0]).join('')}
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{member.name}</h3>
            <p className="text-red-600 font-medium mb-2">{member.role}</p>
            <p className="text-sm text-gray-600">{member.bio}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
