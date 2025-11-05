import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ReadUserDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';
import { Public } from '../auth/decorators/decorator.jwt';
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Public()
  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<ReadUserDto> {
    const user = await this.usersService.create(createUserDto);
    return plainToInstance(ReadUserDto, user, {
      excludeExtraneousValues: true, 
    });
  }
  @Public()
  @Get()
  async findAll(): Promise<ReadUserDto[]> {
    const users = await this.usersService.findAll();
    return plainToInstance(ReadUserDto, users, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReadUserDto> {
    const user = await this.usersService.findById(+id);
    return plainToInstance(ReadUserDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ReadUserDto> {
    const user = await this.usersService.update(+id, updateUserDto);
    return plainToInstance(ReadUserDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(+id);
  }
}
