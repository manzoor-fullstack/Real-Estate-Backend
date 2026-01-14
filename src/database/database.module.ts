import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Module({
  imports: [
    // ✅ Make ConfigModule global so ConfigService works
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // ✅ Async MongooseModule
    MongooseModule.forRootAsync({
      imports: [ConfigModule], // Must import ConfigModule here
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const atlasUri = configService.get<string>('MONGODB_ATLAS_URI');
        const localUri = configService.get<string>('MONGODB_URI');

        const uri = atlasUri || localUri;

        if (!uri) {
          throw new Error(
            'MongoDB URI is missing. Set MONGODB_ATLAS_URI or MONGODB_URI'
          );
        }

        return {
          uri,
          // Optional: Additional Mongoose options
          useNewUrlParser: true,
          useUnifiedTopology: true,
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit() {
    this.connection.on('connected', () => {
      this.logger.log('✅ Successfully connected to MongoDB');
    });

    this.connection.on('error', (error) => {
      this.logger.error(`❌ MongoDB connection error: ${error}`);
    });

    this.connection.on('disconnected', () => {
      this.logger.warn('⚠️ MongoDB disconnected');
    });

    // Log initial connection state
    if (this.connection.readyState === 1) {
      this.logger.log('🚀 MongoDB is ready and connected on startup');
    }
  }
}
