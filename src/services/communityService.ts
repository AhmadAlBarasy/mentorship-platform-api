import prisma from '../db';

const getCommunityByFieldService = async(options: {
  searchBy: {
    id?: string,
    managerId?: string,
  },
}) => {
  const { searchBy } = options;
  const filters = [];

  if (searchBy.id){
    filters.push({ id: searchBy.id });
  }

  if (searchBy.managerId){
    filters.push({ managerId: searchBy.managerId });
  }

  const community = await prisma.communities.findFirst({
    where: {
      OR: filters,
    },
  });

  return community;
};

export { getCommunityByFieldService };
