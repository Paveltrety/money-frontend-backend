const UserModel = require("../models/user-model");
const bcryptjs = require("bcryptjs");
const uuid = require("uuid");
const mailService = require("./mail-service");
const tokenService = require("./token-service");
const UserDto = require("../dtos/user-dto");
const ApiError = require("../exceptions/api-error");

class UserService {
  async registration(email, password) {
    const candidate = await UserModel.findOne({ email });
    console.log(candidate, 'candidate')
    if (candidate) {
      throw ApiError.BadReauestError(
        `Пользователь с почтой ${email} уже существует`
      );
    }
    const hashPassword = await bcryptjs.hash(password, 3);
    console.log(hashPassword, 'hashPassword')

    const activationLink = uuid.v4(); // v34fa-asfasf-142saf-sa-asf
    console.log(activationLink, 'activationLink')

    const user = await UserModel.create({
      email,
      password: hashPassword,
      activationLink,
    });
    console.log(user, 'user')

    await mailService.sendActivationMail(
      email,
      `${process.env.API_URL}/api/activate/${activationLink}`
    );

    const userDto = new UserDto(user); // id, email, isActivated
    console.log(userDto, "userDto");
    const tokens = tokenService.generateTokens({ ...userDto });
    await tokenService.saveToken(userDto.id, tokens.refreshToken);

    return { ...tokens, user: userDto };
  }

  async activate(activationLink) {
    const user = await UserModel.findOne({ activationLink });
    if (!user) {
      throw ApiError.BadReauestError(`Некорректная ссылка активации`);
    }
    user.isActivated = true;
    await user.save();
  }

  async login(email, password) {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw ApiError.BadReauestError(`Пользователь не найден`);
    }
    if (!user.isActivated) {
      throw ApiError.BadReauestError(`Пользователь не активирован`);
    }
    const isPassEquals = await bcryptjs.compare(password, user.password);
    if (!isPassEquals) {
      throw ApiError.BadReauestError(`Не верный пароль`);
    }
    const userDto = new UserDto(user);
    const tokens = tokenService.generateTokens({ ...userDto });
    await tokenService.saveToken(userDto.id, tokens.refreshToken);

    return { ...tokens, user: userDto };
  }

  async logout(refreshToken) {
    const token = await tokenService.removeToken(refreshToken);
    return token;
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw ApiError.UnauthorizedError();
    }
    const userData = tokenService.validateRefreshToken(refreshToken);
    const tokenFromDb = await tokenService.findToken(refreshToken);
    if (!userData || !tokenFromDb) {
      throw ApiError.UnauthorizedError();
    }
    const user = await UserModel.findById(userData.id);
    const userDto = new UserDto(user);
    const tokens = tokenService.generateTokens({ ...userDto });

    await tokenService.saveToken(userDto.id, tokens.refreshToken);
    return { ...tokens, user: userDto }
  }
}

module.exports = new UserService();
