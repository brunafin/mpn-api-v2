import { Global, Module } from '@nestjs/common';
import { PublicListingCache } from './public-listing.cache';

@Global()
@Module({
  providers: [PublicListingCache],
  exports: [PublicListingCache],
})
export class PublicListingCacheModule {}
